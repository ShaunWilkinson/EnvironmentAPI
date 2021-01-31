const CosmosClient = require("@azure/cosmos").CosmosClient;

const endpoint = "https://environmental-data.documents.azure.com:443/"
const key = "E3mpOgfUNvjUJCMiYIIjhcv5DwD5w4dLgHMpjIxv8OPg4HbIPIzMPdvz48ZQFqg9jWwiW7PDo9utNfBggDe92g=="
const databaseId = "environmental-data"
const containerId = "MyCollection"

const client = new CosmosClient({endpoint, key});
const database = client.database(databaseId);
const container = database.container(containerId);

/**
 * HTTP function that returns all data
 * @param {*} context SYSTEM PROVIDED
 */
module.exports = async function (context) {
    context.log('Retrieving all data.');

    // Return all records
    const query = {
        query: `SELECT c.temperature, c.humidity, udf.convertTime(c._ts) as submittedTime
                FROM c`
    }

    // Await returning all records
    try {
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