const CosmosClient = require("@azure/cosmos").CosmosClient;

const endpoint = "https://environmental-data.documents.azure.com:443/"
const key = "E3mpOgfUNvjUJCMiYIIjhcv5DwD5w4dLgHMpjIxv8OPg4HbIPIzMPdvz48ZQFqg9jWwiW7PDo9utNfBggDe92g=="
const databaseId = "environmental-data"
const containerId = "MyCollection"

const client = new CosmosClient({endpoint, key});
const database = client.database(databaseId);
const container = database.container(containerId);

/**
 * HTTP function that returns all data from a specified date
 * @param {*} context SYSTEM PROVIDED
 * @param {*} req Users request - Must contain 'DateFrom' value in body of request
 */
module.exports = async function (context, req) {
    context.log('Retrieving data from given date.');

    // Retrieve the date from filter, if not present then set to null
    let dateRegex = new RegExp(/^\d\d\d\d-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/);
    let dateFromFilter = dateRegex.test(req.query.DateFrom) ? req.query.DateFrom : null
    let providedDate = dateFromFilter != null

    // If user doesn't provide a valid start date then return an error
    if(!providedDate) {
        context.res = {
            status: 400,
            body: "Must provide a Date in format YYYY-MM-DD in body of request"
        }

        return;
    }

    // Return all records where the creation time is greater than the provided date
    let query = {
        query: `SELECT c.temperature, c.humidity, udf.convertTime(c._ts) as submittedTime
                FROM c
                WHERE udf.convertTime(c._ts) >= '${dateFromFilter}'`
    }

    try {
        // Await returning all records
        const { resources: items } = await container.items
            .query(query)
            .fetchAll();

        context.res = {
            status: 200, /* Defaults to 200 */
            body: items
        };
    } catch {
        context.res = {
            status: 400,
            body: "Failed to retrieve records"
        }
    }
}