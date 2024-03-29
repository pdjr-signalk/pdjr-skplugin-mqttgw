# pdjr-skplugin-mqttgw

Exchange data between MQTT and Signal K.

## Description

**pdjr-skplugin-mqttgw** exports data to and imports data from an
MQTT server.

Export frequency, scope and retention behaviour can be set globally
and on a per-item basis.

## Configuration

<dl>
  <dt>Broker configuration <code>broker</code></dt>
  <dd>
    Properties which relate to the MQTT peer.
    <dl>
      <dt>MQTT broker URL <code>mqttBrokerUrl</code></dt>
      <dd>
        Optional string property specifying the network location of the
        MQTT broker to which connection should be made.
        Defaults to 'mqtt://127.0.0.1/'.
      </dd>
      <dt>MQTT client credentials <code>mqttClientCredentials</code></dt>
      <dd>
        Optional string property specifying the username and password
        which must be presented by a client connecting to the MQTT
        broker.
        Even though this property is notionally optional, you will surely
        want to supply your own meaningful values.
        Defaults to 'username:password'.
      </dd>
      <dt>Reject unauthorised? <code>rejectUnauthorised</code></dt>
      <dd>
        Optional boolean which says whether or not to reject TLS/SSL
        connections which fail certificate checks.
        Defaults to true.
      </dd>
    </dl>
  </dd>
  <dt>Publication settings <code>publication</code></dt>
  <dd>
    Optional properties which relate to the publication of Signal K
    data on the MQTT broker.
    <dl>
      <dt>Prefix to apply to all published topic names <code>root</code></dt>
      <dd>
        Optional prefix to apply to all published topic names.
        Defaults to 'signalk/'.
      </dd>
      <dt>Default retain setting for published topic data <code>retainDefault</code></dt>
      <dd>
        Optional boolean specifying the default topic retention behaviour.
        Defaults to true.
      </dd>
      <dt>Default minimum interval between topic updates in seconds <code>intervalDefault</code></dt>
      <dd>
        Defaults to 60.
      </dd>
      <dt>Publish meta data associated with a path <code>metaDefault</code></dt>
      <dd>
      </dd>
      <dt>Signal K self paths which should be published to the remote MQTT server <code></code></dt>
      <dd>
        <dl>
          <dt>Path <code>path</code></dt>
          <dd>
            Required string value specifying a Signal K path that
            references a data value that should be published to the
            MQTT server.
          </dd>
          <dt>Topic name to which path value should be published <code>topic</code></dt>
          <dd>
            Optional string value supplying a topic name suffix which
            will be appended to <em>root</em> to generate a topic name
            to which the value of <em>path</em> will be published.
            Defaults to <em>path</em> with all periods replaced by
            slashes.
            <p>
            Values published to the generated topic name result from
            applying JSON.stringify() to the value on Signal K
            <em>path</em>.</p>
          </dd>
          <dt>Retain setting for this item (overrides default) <code>retain</code></dt>
          <dd>
            Optional boolean which overrides <em>retainDefault</em> for
            this item only.
          </dd>
          <dt>Publication interval for this item (overrides default) <code>interval</code></dt>
          <dd>
            Optional number specifying an interval in seconds which
            overrides <em>intervalDefault</em> for this item only.
          </dd>
          <dt>Whether or not to publish meta data for this item (overrides default) <code>meta</code></dt>
          <dd>
            Optional boolean which specifies whether or not to publish
            metadata associated with <em>path</em>.
            Overrides <em>metaDefault</em> for this item only.
            <p>
            If the publication of <em>path</em>'s metadata associated
            is requested, then such data is published the the topic
            '<em>topic</em>/meta'.</p>
          </dd>
        </dl>
      </dd>
    </dl>
  </dd>
  <dt>Subscription settings <code>subscription</code></dt>

The <em>subscription</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topics</td>
<td><pre>[]</pre></td>
<td>
Array of <em>topic</em> objects (see below) to which the plugin should subscribe.
Required.
</td>
</tr>
<tr>
<td>root</td>
<td><pre>"mqtt."</pre></td>
<td>
Prefix to apply to the Signal K path name of all subscribed <em>topics</em>.
Optional.
</td>
</tr>
</table>

Each <em>topic</em> object has the following properties.

<table>
<tr><th>Property&nbsp;name</th><th>Default&nbsp;property&nbsp;value</th><th>Description</th></tr>
<tr>
<td>topic</td>
<td>(none)</td>
<td>
Name of a topic on the MQTT server.
Required.
</td>
</tr>
<tr>
<td>path</td>
<td>(none)</td>
<td>
Signal K path where data received on <em>topic<em> should be saved.
Optional.
</td>
</tr>
</table>

If <em>path</em> is omitted, then a value is generated automatically by replacing
all slashes in <em>topic</em> with periods.
A final Signal K path name results from appending the specified or computed path to
<em>subscription.root</em>.

## Operation

The plugin must be configured to suit local and user requirements
before it can enter production.

## Author

Paul Reeve <*preeve_at_pdjr_eu*>
