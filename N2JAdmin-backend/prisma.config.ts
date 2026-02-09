import { defineConfig } from '@prisma/config';

export default defineConfig({
    // The Prisma CLI currently doesn't strictly support the 'datasources' key in the top level config for Migration URL yet in all versions
    // However, for the purpose of removing the warning, the CLI looks for the config.
    // Let's try the simplest valid config that might work or just keep the schema clean.

    // Actually, to fix the lint "Did you mean 'datasource'?"
    // earlyAccess: true,

});
