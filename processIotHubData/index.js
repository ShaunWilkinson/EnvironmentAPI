module.exports = function (context, IoTHubMessages) {
    context.log(`JavaScript eventhub trigger function called for message array: ${IoTHubMessages}`);

    let count = 0;
    let temperature = 0.0;
    let humidity = 0.0;
    let deviceId = "";
    
    IoTHubMessages.forEach(message => {
        context.log(`Processed message: ${message}`);
        count++;
        temperature = message.temperature;
        humidity = message.humidity;
        deviceId = message.deviceId;
    });

    var output = {
        "deviceId": deviceId,
        "measurementsCount": count,
        "temperature": temperature,
        "humidity": humidity
    }

    context.log(`output content: ${output}`);

    context.bindings.cosmosDBOutput = output;

    context.done();
};