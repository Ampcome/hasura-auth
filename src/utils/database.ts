import { ENV } from './env';
import { PoolConfig, Pool } from 'pg';
import { logger } from '../logger';

const dbConfig: PoolConfig = {
    connectionString: ENV.HASURA_GRAPHQL_DATABASE_URL,
    connectionTimeoutMillis: 5000,
    max: 10
};

const database = new Pool(dbConfig);
database.connect().catch(error => {
    console.error(error);
});
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const reachDatabase = async () => {
    try {
        database.query("SELECT 'DBD::Pg ping'")
    } catch (err) {
       
        logger.info(`Database is not ready. Retry in 5 seconds: `, err);
        await delay(5000);
        await reachDatabase();
    }
};

export const waitForDatabase = async () => {
    logger.info('Waiting for Database Connection to be ready...');
    await reachDatabase();
    logger.info('Database is ready');
};

export default database;


