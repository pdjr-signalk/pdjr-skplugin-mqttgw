/*
 * Copyright 2021 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

const mqtt = require('mqtt');
const _ = require('lodash');

const Delta = require("signalk-libdelta/Delta.js");
const Log = require("signalk-liblog/Log.js");

const PLUGIN_ID = "mqttgw";
const PLUGIN_NAME = "MQTT gateway";
const PLUGIN_DESCRIPTION = "Exchange data with an MQTT server";
const PLUGIN_SCHEMA = {
  "type": "object",
  "properties": {
    "broker": {
      "title": "Broker configuration",
      "type": "object",
      "properties": {
        "mqttBrokerUrl": {
          "title": "MQTT broker url (eg: mqtt://192.168.1.203)",
          "type": "string"
        },
        "mqttClientCredentials": {
          "title": "MQTT client credentials (as 'username:password')",
          "type": "string"
        },
        "rejectUnauthorised": {
          "title": "Reject unauthorised?",
          "type": "boolean"
        }
      }
    },
    "publication": {
      "title": "Publication settings",
      "type": "object",
      "properties": {
        "root": {
          "title": "Prefix to apply to all published topic names",
          "type": "string"
	      },
        "retainDefault": {
          "title": "Default retain setting for published topic data",
          "type": "boolean"
        },
        "intervalDefault": {
          "title": "Default minimum interval between topic updates in seconds",
          "type": "number"
        },
        "metaDefault": {
          "title": "Publish any available meta data associated with a path",
          "type": "boolean",
        },
	      "paths": {
          "type": "array",
          "title": "Signal K self paths which should be published to the remote MQTT server",
          "items": {
            "type": "object",
            "properties": {
              "path": {
                "type": "string",
                "title": "Path"
              },
              "topic": {
                "type": "string",
                "title": "Override the topic name automatically generated from path"
              },
              "retain": {
                "type": "boolean",
                "title": "Override the default publication retain setting for this item"
              },
              "interval": {
                "type": "number",
                "title": "Override the default interval between publication events for this item"
              },
              "meta": {
                "type": "boolean",
                "title": "Override the default setting for meta data publication"
              }
            }
          }
	      }
      }
    },
    "subscription": {
      "type": "object",
      "properties": {
        "root": {
          "title": "Prefix to apply to all received subscription paths",
          "type": "string"
        },
        "topics": {
          "type": "array",
          "title": "MQTT paths to receive",
          "default": [],
          "items": {
            "type": "object",
            "properties": {
              "topic": { 
                "title": "Topic",
                "type": "string"
              },
              "path": { 
                "type": "string", 
                "title": "Override the path name automatically generated from topic"
              }
            }
          }
        }
      }
    },
    "default": {
      "broker": {
        "mqttBrokerUrl": "mqtt:127.0.0.1",
        "mqttClientCredentials": "username:password",
        "rejectUnauthorised": true
      },
      "publication": {
        "root": "signalk/",
        "retainDefault": true,
        "intervalDefault": 60,
        "metaDefault": false,
        "paths": []
      },
      "subscription": {
        "root": "mqtt.",
        "topics": []
      }
    }
  }
};
const PLUGIN_UISCHEMA = {};

const BROKER_RECONNECT_PERIOD = 60000;

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = PLUGIN_DESCRIPTION;
  plugin.schema = PLUGIN_SCHEMA;
  plugin.uiSchema = PLUGIN_UISCHEMA;

  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
  const delta = new Delta(app, plugin.id);

  plugin.start = function(options) {

    plugin.options = _.cloneDeep(plugin.schema.properties.default);
    _.merge(plugin.options, options);
    plugin.options.publication.paths = plugin.options.publication.paths.reduce((a,path) => {
      if (path.path) {
        a.push({
          path: path.path,
          topic: `${plugin.options.publication.root}${(path.topic)?path.topic:(path.path.replaceAll('.','/'))}`,
          retain: (path.retain)?path.retain:plugin.options.publication.retainDefault,
          interval: (path.interval)?path.interval:plugin.options.publication.intervalDefault,
          meta: (path.meta)?path.meta:plugin.options.publication.metaDefault
        });
      } else log.W("dropping publication with missing 'path' property");
      return(a);
    }, []);
    plugin.options.subscription.topics = plugin.options.subscription.topics.reduce((a,topic) => {
      if (topic.topic) {
        a.push({
          topic: topic.topic,
          path: `${plugin.options.subscription.root}${(topic.path)?topic.path:topic.topic}`.replace('/','.')
        })
      } else log.W("dropping subscription with missing 'topic' property");
      return(a);
    }, []);

    app.debug(`using configuration: ${JSON.stringify(plugin.options, null, 2)}`)

    const client = mqtt.connect(
      plugin.options.broker.mqttBrokerUrl,
      {
        rejectUnauthorized: plugin.options.broker.rejectUnauthorised,
        reconnectPeriod: BROKER_RECONNECT_PERIOD,
        clientId: app.selfId,
        username: plugin.options.broker.mqttClientCredentials.split(':')[0].trim(),
        password: plugin.options.broker.mqttClientCredentials.split(':')[1].trim()
      }
    );
        
    client.on('error', (err) => {
      log.E(`MQTT broker connection error (${err})`, false);
    });
        
    client.on('connect', () => {
      log.N(`connected to broker ${plugin.options.broker.mqttBrokerUrl}`);
      if ((plugin.options.subscription) && (plugin.options.subscription.topics) && (Array.isArray(plugin.options.subscription.topics)) && (plugin.options.subscription.topics.length > 0)) {
        app.debug(`subscribing to ${plugin.options.subscription.topics.length}`);
        plugin.options.subscription.topics.forEach(topic => {
          app.debug(`subscribing to topic '${topic.topic}'`);
          client.subscribe(topic.topic);
        });
      }
      if ((plugin.options.publication) && (plugin.options.publication.paths) && (Array.isArray(plugin.options.publication.paths)) && (plugin.options.publication.paths.length > 0)) {
        app.debug(`publishing ${plugin.options.publication.paths.length} paths`);
        startSending(plugin.options.publication, client);
      }
      unsubscribes.push(_ => client.end());
    });
        
    client.on('message', function(topic, message) {
      var path = plugin.options.subscription.topics.reduce((a,t) => { return(((topic == t.topic) && (t.path))?t.path:a) }, (plugin.options.subscription.root + topic.replace(/\//g, "."))); 
      var value = message.toString();                                                                                                                           
      if ((!isNaN(value)) && (!isNaN(parseFloat(value)))) value = parseFloat(value);                                                                                        
      if ((!isNaN(value)) && (!isNaN(parseInt(value)))) value = parseInt(value);                                                                                        
      app.debug(`received message: '${value}' on topic: '${path}'`);                                                                                                
      delta.addValue(path, value).commit().clear();                                                                                       
    });
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
  }

  function startSending(publicationoptions, client) {
    var value;

    publicationoptions.paths.forEach(path => {
      app.debug(`publishing topic '${path.topic}'`);
      if (path.meta) app.debug(`publishing topic '${path.topic}/meta'`);

      unsubscribes.push(app.streambundle.getSelfBus(path.path)
      .toProperty()                 // examine values not change events
      .sample(path.interval * 1000) // read value at the configured interval
      .skipDuplicates((a,b) =>      // detect changes by value id or, if missing, by value
        (a.value.id)?(a.value.id === b.value.id):(a.value === b.value)
      )
      .onValue(value => {
        app.debug(`updating topic '${path.topic}' with '${JSON.stringify(value.value, null, 2)}'`);
        client.publish(path.topic, JSON.stringify(value.value), { qos: 1, retain: path.retain });
        
        // Publish any selected and available meta data just once the
        // first time a data value is published.
        if (path.meta) {
          value = app.getSelfPath(path.path);
          if ((value) && (value.meta)) {
            client.publish(`${path.topic}/meta`, JSON.stringify(value.meta), { qos: 1, retain: true });
            app.debug(`updating topic '${path.topic}/meta' with '${JSON.stringify(value.value, null, 2)}'`);
            path.meta = false;
          }
        }

      }));
    });
  }

  return plugin;

}
