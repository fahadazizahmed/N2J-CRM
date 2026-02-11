import { defineConfig } from '@prisma/config';

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:12345678@localhost:5432/testing?schema=public',
    },
});
