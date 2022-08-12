function mapFromDittoProtocolMsg(namespace, id, group, channel, criterion, action, path, dittoHeaders, value, status, extra) {
    // Create text data
    let textPayload = '{"temperature": ' + value.measurements.properties.temperature + ', "humidity": ' + value.measurements.properties.humidity + ', "thingId": "' + namespace + ':' + id + '"}';
    // In this case we data only in text format
    let bytePayload = null;
    // Set message content type
    let contentType = 'text/plain; charset=UTF-8';

    // Return mapped message
    return  Ditto.buildExternalMsg(
        dittoHeaders,
        textPayload,
        bytePayload,
        contentType
    );
}