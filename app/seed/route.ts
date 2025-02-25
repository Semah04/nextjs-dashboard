"use server"; // Assure que ce code s'exécute uniquement côté serveur

import bcrypt from 'bcryptjs'; // Utiliser bcryptjs pour éviter les problèmes
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

// Connexion à PostgreSQL avec SSL activé
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedDatabase() {
  try {
    await sql`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        image_url VARCHAR(255) NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `;

    // 🔹 **Insertion des données**
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return sql`
          INSERT INTO users (id, name, email, password)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
          ON CONFLICT (id) DO NOTHING;
        `;
      }),
    );

    await Promise.all(
      customers.map((customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `),
    );

    await Promise.all(
      invoices.map((invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `),
    );

    await Promise.all(
      revenue.map((rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `),
    );

    return { message: 'Database seeded successfully', users: insertedUsers };
  } catch (error) {
    console.error("Seeding error:", error);
    throw error;
  }
}

// Route API
export async function GET() {
  try {
    const result = await seedDatabase();
    return Response.json(result);
  } catch (error) {
    console.error("Seeding error:", error);

    // ✅ Vérification et typage correct de l'erreur
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}

