const express = require("express");
const app = express();
const port = 3000;
const mariadb = require("mariadb");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { body, param, validationResult } = require('express-validator');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ballu',
  database: 'sample',
  port: 3306,
  connectionsLimit: 100,
  acquireTimeout: 30000
});

app.use(express.json());

// Middleware to handle database connection
async function getDbConnection() {
  try {
    return await pool.getConnection();
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Internal server error');
  }
}


// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sample API',
      version: '1.0.0',
      description: 'A sample API for managing customers, foods, and orders',
    },
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - companyName
 *               - companyCity
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Unique identifier for the company
 *                 example: C001
 *               companyName:
 *                 type: string
 *                 description: Name of the company
 *                 example: TechCorp
 *               companyCity:
 *                 type: string
 *                 description: City where the company is located
 *                 example: San Francisco
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

app.post('/api/companies', [
  body('companyId').isLength({ min: 1, max: 6 }).withMessage('Company ID must be between 1 and 6 characters long'),
  body('companyName').trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company Name must be between 1 and 25 characters'),
  body('companyCity').trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company City must be between 1 and 25 characters'),
], async (req, res) => {  
  req.db = await getDbConnection();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { companyId, companyName, companyCity } = req.body;

  try {
    await req.db.query(
      'INSERT INTO company (COMPANY_ID, COMPANY_NAME, COMPANY_CITY) VALUES (?, ?, ?)',
      [companyId, companyName, companyCity]
    );
    res.status(201).json({ message: 'Company created successfully' });
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/companies/{companyId}:
 *   patch:
 *     summary: Update a company's name or city
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: The name of the company
 *                 example: TechCorp
 *               companyCity:
 *                 type: string
 *                 description: The city where the company is located
 *                 example: San Francisco
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Company not found
 */


app.patch('/api/companies/:companyId', [
  param('companyId').isLength({ min: 1, max: 6 }).withMessage('Company ID must be between 1 and 6 characters long'),
  body('companyName').optional().trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company Name must be between 1 and 25 characters'),
  body('companyCity').optional().trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company City must be between 1 and 25 characters'),
], async (req, res) => {  
  req.db = await getDbConnection();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { companyId } = req.params;
  const { companyName, companyCity } = req.body;

  // Ensure at least one field is provided
  if (!companyName && !companyCity) {
    return res.status(400).json({ error: 'At least one field (companyName or companyCity) must be provided' });
  }

  try {
    let query = 'UPDATE company SET ';
    const updateFields = [];
    const values = [];

    if (companyName) {
      updateFields.push('COMPANY_NAME = ?');
      values.push(companyName);
    }
    if (companyCity) {
      updateFields.push('COMPANY_CITY = ?');
      values.push(companyCity);
    }

    query += updateFields.join(', ') + ' WHERE COMPANY_ID = ?';
    values.push(companyId);

    const result = await req.db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/companies/{companyId}:
 *   put:
 *     summary: Update or create a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - companyCity
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: Name of the company
 *                 example: TechCorp
 *               companyCity:
 *                 type: string
 *                 description: City where the company is located
 *                 example: San Francisco
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Invalid input
 */


app.put('/api/companies/:companyId', [
  param('companyId').isLength({ min: 1, max: 6 }).withMessage('Company ID must be between 1 and 6 characters long'),
  body('companyName').trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company Name must be between 1 and 25 characters'),
  body('companyCity').trim().isLength({ min: 1, max: 25 }).escape().withMessage('Company City must be between 1 and 25 characters'),
], async (req, res) => {
  req.db = await getDbConnection();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { companyId } = req.params;
  const { companyName, companyCity } = req.body;

  try {
    const result = await req.db.query(
      'INSERT INTO company (COMPANY_ID, COMPANY_NAME, COMPANY_CITY) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE COMPANY_NAME = ?, COMPANY_CITY = ?',
      [companyId, companyName, companyCity, companyName, companyCity]
    );
    if (result.affectedRows === 1 && result.warningStatus === 0) {
      res.status(201).json({ message: 'Company created successfully' });
    } else {
      res.json({ message: 'Company updated successfully' });
    }
  } catch (err) {
    console.error('Error updating/creating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});

/**
 * @swagger
 * /api/companies/{companyId}:
 *   delete:
 *     summary: Delete a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *       404:
 *         description: Company not found
 */


app.delete('/api/companies/:companyId', [
  param('companyId').isLength({ min: 1, max: 6 }).withMessage('Company ID must be between 1 and 6 characters long'),
], async (req, res) => {
  req.db = await getDbConnection();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { companyId } = req.params;

  try {
    const result = await req.db.query('DELETE FROM company WHERE COMPANY_ID = ?', [companyId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    req.db.release();
  }
});



/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get list of items
 *     description: Returns a list of items from the database
 *     responses:
 *       200:
 *         description: Successfully retrieved list of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 itemList:
 *                   type: array
 *                   items:
 *                     type: string
 */
// GET request for list of items
app.get('/api/items', async (req, res) => {
    try {      
      req.db = await getDbConnection();
      const rows = await req.db.query('SELECT ITEMNAME FROM listofitem');
      const items = rows.map(row => row.ITEMNAME.trim());
      res.json({ itemList: items });
    } catch (err) {
      console.error('Error fetching items:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      req.db.release();
    }
  });

/**
 * @swagger
 * /api/studenttitles:
 *   get:
 *     summary: Get list of student titles
 *     description: Returns a list of student titles from the database
 *     responses:
 *       200:
 *         description: Successfully retrieved list of student titles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 titleList:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
  // GET request for student titles
app.get('/api/studenttitles', async (req, res) => {
    try {
      req.db = await getDbConnection();
      const rows = await req.db.query('SELECT TITLE FROM student');
      const titles = rows.map(row => row.TITLE.trim());
      res.json({ titleList: titles });
    } catch (err) {
      console.error('Error fetching student titles:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      req.db.release();
    }
  });

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get list of company details
 *     description: Returns a list of companies with their ID, name, and city from the database
 *     responses:
 *       200:
 *         description: Successfully retrieved list of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyList:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The unique identifier for the company
 *                         example: C001
 *                       name:
 *                         type: string
 *                         description: The name of the company
 *                         example: TechCorp
 *                       city:
 *                         type: string
 *                         description: The city where the company is located
 *                         example: San Francisco
 *       500:
 *         description: Internal server error
 */
  // GET request for company details
app.get('/api/companies', async (req, res) => {
    try {      
      req.db = await getDbConnection();
      const rows = await req.db.query('SELECT COMPANY_ID, COMPANY_NAME, COMPANY_CITY FROM company');

      const companies = rows.map(row => ({
        id: row.COMPANY_ID.trim(),
        name: row.COMPANY_NAME.trim(),
        city: row.COMPANY_CITY.trim()
      }));
      res.json({ companyList: companies });
    } catch (err) {
      console.error('Error fetching company details:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      req.db.release();
    }
  });




app.listen(port, () => {
  console.log(`Server running at http://165.22.9.94:${port}`);
  console.log(`Swagger UI available at http://165.22.9.94:${port}/api-docs`);
});
