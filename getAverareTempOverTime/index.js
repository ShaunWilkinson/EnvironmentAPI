const {BlobServiceClient} = require('@azure/storage-blob');
var blobServiceClient;
var containerClient;

module.exports = async function (context, req) {
    // Define the connection strings
    let connectionString = "DefaultEndpointsProtocol=https;AccountName=environmentdata;AccountKey=jZOeg2EmmcEAiiGJezI71ks5+0cw6qiUaXciakdp57st2VvFkx9mj4LdGffJUNF+/Qo2aKtVkQD5OLJ6NYZJXg==;EndpointSuffix=core.windows.net"
    let containerName = "environment-container"

    // Retrieve the date from filter, if not present then set to null
    let dateRegex = new RegExp(/^\d\d\d\d-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/);
    let dateFromFilter = dateRegex.test(req.query.DateFrom) ? req.query.DateFrom : null
    let dateFromYear = dateFromFilter != null ? dateFromFilter.substring(0, 4) : null;
    let dateFromMonth = dateFromFilter != null ? dateFromFilter.substring(5, 7) : null;
    let dateFromDay = dateFromFilter != null ? dateFromFilter.substring(8, 10) : null;

    // Connect to the blob storage
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    
    context.log("Starting pull from Blob Storage");

    let testStartDate = new Date(parseInt(dateFromYear, 10), parseInt(dateFromMonth, 10)-1, parseInt(dateFromDay, 10)); // Parses the start date from input
    let blockBlobServiceClient = null;
    let responseData = null;
    for await (const blob of containerClient.listBlobsFlat()) {
        if(blob.properties.lastModified >= testStartDate && blob.name != "variables.txt") {
            blockBlobServiceClient = containerClient.getBlockBlobClient(blob.name);
            const downloadedBlockBlobResponse = await blockBlobServiceClient.download();
            responseData += await streamToString(downloadedBlockBlobResponse.readableStreamBody);
        }
    }

/*
    // If the filter is not null then use it, otherwise return all
    
    if(dateFromFilter == null) {
        responseData = await processData(undefined, context);
    } else {
        // create array of all dates between the start date and now, this will be used to loop through the data
        //let daysOfYear = [];
        let startDate = new Date(parseInt(dateFromYear, 10), parseInt(dateFromMonth, 10)-1, parseInt(dateFromDay, 10), 0); // Parses the start date from input
        for (var date = startDate; date <= new Date(); date.setDate(date.getDate() + 1)) {
            //daysOfYear.push(new Date(d));
            for(var hour = date.getHours(); hour <= 23; hour++) {
                responseData = await processData(date, hour, context)
            }
        }
    }
    
    //let entity = await iter.next();
    //while(!entity.done) {
    //    let item = entity.value;
//
  //      if(item.kind === "prefix") {
    //        //context.log(`Prefix: ${item.name}`);
     ///   } else {
     //       //context.log(`BlobItem: ${item.name}`);
      //  }

//        entity = await iter.next();
 //   }


    //const responseMessage = name
    //    ? "Hello, " + name + ". This HTTP triggered function executed successfully."
    //    : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";
*/
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseData
    };
}

/**
 * 
 * @param {Date} date - The date to process
 * @param {*} context - The function context, used for logging
 */
async function processData(date, hour, context) {
    let iter = null
    if (typeof date === 'undefined') {
        iter = containerClient.listBlobsByHierarchy({prefix: `ServerEnvironment/`});
    } else {
        let formattedMonth = ("0" + (date.getMonth() + 1)).slice(-2); // Gets the month in a 2-digit format
        let formattedDay = ("0" + date.getDate()).slice(-2); // Gets the day in a 2-digit format
        let formattedHour = ("0" + hour).slice(-2);
        //context.log(`ServerEnvironment/01/${date.getFullYear()}/${formattedMonth}/${formattedDay}/${formattedHour}/`);
        iter = containerClient.listBlobsByHierarchy("/", {prefix: `ServerEnvironment/01/${date.getFullYear()}/${formattedMonth}/${formattedDay}/${formattedHour}/`});
    }

    let entity = await iter.next();
    let responseData = null;
    while(!entity.done) {
        let item = entity.value;

        if(item.kind === "prefix") {
            //context.log(`Prefix: ${item.name}`);
        } else {
            // context.log(`BlobItem: ${item.name}`);

            let blockBlobServiceClient = containerClient.getBlockBlobClient(item.name);
            //let blobContent = await blockBlobServiceClient.download(0);
            //responseData += await streamToString(blobContent.readableStreamBody);

            // Query and convert a blob to a string
            const queryBlockBlobResponse = await blockBlobServiceClient.query("select * FROM BlobStorage where");
            const downloaded = (await streamToBuffer(queryBlockBlobResponse.readableStreamBody)).toString();
            console.log("Query blob content:", downloaded);
        }

        entity = await iter.next();
    }

    context.log(responseData);
    return responseData;
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  }

// A helper function used to read a Node.js readable stream into a string
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
}