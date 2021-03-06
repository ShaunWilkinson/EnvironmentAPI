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
    const dateRegex = new RegExp(/^\d\d\d\d-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/);
    const dateFromFilter = dateRegex.test(req.query.DateFrom) ? req.query.DateFrom : null;
    const dateToFilter = dateRegex.test(req.query.DateTo) ? req.query.DateTo : null;
    const providedStartDate = dateFromFilter != null;
    const providedEndDate = dateToFilter != null;

    // Creates a query that will return all data between given dates, after a given date or all data depending on provided values
    let query = ""
    if(providedStartDate) {
        if(providedEndDate) {
            query = {
                query: `SELECT *
                        FROM c
                        WHERE udf.convertTime(c._ts) >= '${dateFromFilter}' AND udf.convertTime(c._ts) <= '${dateToFilter}'`
            }
        } else {
            query = {
                query: `SELECT *
                        FROM c
                        WHERE udf.convertTime(c._ts) >= '${dateFromFilter}'`
            }
        }
    } else {
        query = {
            query: `SELECT *
                    FROM c`
        }
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
    } catch (error) {
        context.res = {
            status: 400,
            body: "Failed to retrieve records - " + error
        }
    }
}