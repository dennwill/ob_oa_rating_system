import { Pool } from 'pg';

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ob_oa_rating_system',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    //ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Helper function to execute queries
export async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Helper function to get a single row
export async function getRow(text, params) {
    const result = await query(text, params);
    return result.rows[0];
}

// Helper function to get multiple rows
export async function getRows(text, params) {
    const result = await query(text, params);
    return result.rows;
}

// Helper: assign floors to employee
async function assignFloorsToEmployee(userId, floorIds) {
    // Remove existing assignments
    await query('DELETE FROM employee_floors WHERE user_id = $1', [userId]);
    // Insert new assignments
    if (Array.isArray(floorIds) && floorIds.length > 0) {
        for (const floorId of floorIds) {
            await query('INSERT INTO employee_floors (user_id, floor_id) VALUES ($1, $2)', [userId, floorId]);
        }
    }
}

// Helper: get all floor ids for an employee
async function getFloorsForEmployee(userId) {
    const rows = await getRows('SELECT floor_id FROM employee_floors WHERE user_id = $1', [userId]);
    return rows.map(r => r.floor_id);
}

// User authentication functions
export async function getUserByEmail(email) {
    return await getRow(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email]
    );
}

export async function getUserById(id) {
    return await getRow(
        'SELECT id, email, name, profile_picture, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors, created_at, is_active FROM users WHERE id = $1 AND is_active = TRUE',
        [id]
    );
}

export async function createUser(userData) {
    const { email, password_hash, name, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors, profile_picture } = userData;
    // Insert user with assigned_floors (as array of strings) and profile_picture
    const user = await getRow(
        `INSERT INTO users (email, password_hash, name, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors, profile_picture)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, email, name, profile_picture, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors` ,
        [email, password_hash, name, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors, profile_picture]
    );
    return user;
}

export async function updateUser(id, userData) {
    const { name, email, date_of_birth, gender, assigned_building, assigned_floors, profile_picture } = userData;
    // Build dynamic update query
    let setClauses = [
        'name = $2',
        'date_of_birth = $3',
        'gender = $4',
        'assigned_building = $5',
        'assigned_floors = $6',
        'updated_at = CURRENT_TIMESTAMP'
    ];
    let params = [id, name, date_of_birth, gender, assigned_building, assigned_floors];
    let paramIdx = 7;
    if (typeof profile_picture !== 'undefined') {
        setClauses.push(`profile_picture = $${paramIdx}`);
        params.push(profile_picture);
        paramIdx++;
    }
    if (typeof email !== 'undefined') {
        setClauses.push(`email = $${paramIdx}`);
        params.push(email);
        paramIdx++;
    }
    const user = await getRow(
        `UPDATE users 
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND is_active = TRUE
        RETURNING id, email, name, profile_picture, is_admin, user_type, date_of_birth, gender, assigned_building, assigned_floors`,
        params
    );
    return user;
}

// Employee management functions
export async function getAllEmployees(filters = {}) {
    let queryStr = `
        SELECT id, email, name, profile_picture, date_of_birth, gender, assigned_building, assigned_floors, created_at, updated_at
        FROM users 
        WHERE user_type = 'employee' AND is_active = TRUE
    `;
    const params = [];
    let paramCount = 0;
    if (filters.building) {
        paramCount++;
        queryStr += ` AND assigned_building = $${paramCount}`;
        params.push(filters.building);
    }
    if (filters.search) {
        paramCount++;
        queryStr += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
    }
    queryStr += ' ORDER BY name';
    const users = await getRows(queryStr, params);
    // assigned_floors is already included as an array
    return users;
}

// Rating functions
export async function createRating(ratingData) {
    const { employee_id, room_id, rating, notes, rated_by } = ratingData;
    
    return await getRow(
        `INSERT INTO ratings (employee_id, room_id, rating, notes, rated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [employee_id, room_id, rating, notes, rated_by]
    );
}

export async function updateRating({ rating_id, rating, notes }) {
    return await getRow(
        `UPDATE ratings
        SET rating = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [rating_id, rating, notes]
    );
}

export async function getEmployeeRatings(employeeId) {
    return await getRows(
        `SELECT r.*, rm.room_name, f.floor_name, b.name as building_name
        FROM ratings r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN floors f ON rm.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        WHERE r.employee_id = $1
        ORDER BY r.rated_at DESC`,
        [employeeId]
    );
}

export async function getRatingsWithEmployeeInfo(filters = {}) {
    let query = `
        SELECT 
        u.id as employee_id,
        u.name as employee_name,
        u.email as employee_email,
        u.assigned_building,
        u.assigned_floors,
        COUNT(r.id) as total_ratings,
        AVG(r.rating) as average_rating,
        MIN(r.rated_at) as first_rating,
        MAX(r.rated_at) as last_rating
        FROM users u
        LEFT JOIN ratings r ON u.id = r.employee_id
        WHERE u.user_type = 'employee' AND u.is_active = TRUE
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.employeeId) {
        paramCount++;
        query += ` AND u.id = $${paramCount}`;
        params.push(filters.employeeId);
    }
    
    if (filters.building) {
        paramCount++;
        query += ` AND u.assigned_building = $${paramCount}`;
        params.push(filters.building);
    }
    
    if (filters.floor) {
        paramCount++;
        query += ` AND $${paramCount} = ANY(u.assigned_floors)`;
        params.push(filters.floor);
    }
    
    query += ' GROUP BY u.id, u.name, u.email, u.assigned_building, u.assigned_floors ORDER BY u.name';
    
    return await getRows(query, params);
}

// Building and facility functions
export async function getAllBuildings() {
    return await getRows('SELECT * FROM buildings WHERE is_active = TRUE ORDER BY name');
}

export async function getBuildingWithFloors(buildingId) {
    const building = await getRow('SELECT * FROM buildings WHERE id = $1 AND is_active = TRUE', [buildingId]);
    
    if (!building) return null;
    
    const floors = await getRows(
        `SELECT f.*, 
                COUNT(r.id) as total_rooms,
                COUNT(rt.id) as total_ratings,
                AVG(rt.rating) as average_rating
        FROM floors f
        LEFT JOIN rooms r ON f.id = r.floor_id
        LEFT JOIN ratings rt ON r.id = rt.room_id
        WHERE f.building_id = $1 AND f.is_active = TRUE
        GROUP BY f.id
        ORDER BY f.floor_name`,
        [buildingId]
    );
    
    return { ...building, floors };
}

export async function createBuilding(buildingData) {
    const { name, address, total_floors } = buildingData;
    
    return await getRow(
        `INSERT INTO buildings (name, address, total_floors)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [name, address, total_floors]
    );
}

// History and audit functions
export async function logHistory(historyData) {
    const { user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent } = historyData;
    
    return await query(
        `INSERT INTO history (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent]
    );
}

export async function getHistory(filters = {}) {
    let query = `
        SELECT h.*, u.name as user_name, u.email as user_email, u.profile_picture as user_profile_picture
        FROM history h
        LEFT JOIN users u ON h.user_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.user_id) {
        paramCount++;
        query += ` AND h.user_id = $${paramCount}`;
        params.push(filters.user_id);
    }
    
    if (filters.action) {
        paramCount++;
        query += ` AND h.action = $${paramCount}`;
        params.push(filters.action);
    }
    
    if (filters.table_name) {
        paramCount++;
        query += ` AND h.table_name = $${paramCount}`;
        params.push(filters.table_name);
    }

    // Strict date filtering (exclusive)
    if (filters.from) {
        paramCount++;
        query += ` AND h.created_at > $${paramCount}`;
        params.push(filters.from);
    }
    if (filters.to) {
        paramCount++;
        query += ` AND h.created_at < $${paramCount}`;
        params.push(filters.to);
    }
    
    query += ' ORDER BY h.created_at DESC';
    
    if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
    }
    
    return await getRows(query, params);
}

// Session management functions
export async function createSession(sessionData) {
    const { user_id, token_hash, expires_at, ip_address, user_agent } = sessionData;
    
    return await getRow(
        `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [user_id, token_hash, expires_at, ip_address, user_agent]
    );
}

export async function getSession(tokenHash) {
    return await getRow(
        `SELECT s.*, u.email, u.name, u.is_admin, u.user_type
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1 AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash]
    );
}

export async function deactivateSession(tokenHash) {
    return await query(
        'UPDATE sessions SET is_active = FALSE WHERE token_hash = $1',
        [tokenHash]
    );
}

export async function cleanupExpiredSessions() {
    return await query(
        'UPDATE sessions SET is_active = FALSE WHERE expires_at < CURRENT_TIMESTAMP'
    );
}

// Dashboard statistics
export async function getDashboardStats() {
    const stats = await getRow(`
        SELECT 
        (SELECT COUNT(*) FROM users WHERE user_type = 'employee' AND is_active = TRUE) as total_employees,
        (SELECT COUNT(*) FROM users WHERE user_type = 'admin' AND is_active = TRUE) as total_admins,
        (SELECT COUNT(*) FROM buildings WHERE is_active = TRUE) as total_buildings,
        (SELECT COUNT(*) FROM ratings WHERE rated_at >= CURRENT_DATE) as today_ratings,
        (SELECT COUNT(*) FROM ratings WHERE rated_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_ratings,
        (SELECT AVG(rating) FROM ratings WHERE rated_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_avg_rating
    `);
    
    return stats;
}

// Get top performers for dashboard
export async function getTopPerformers(period = 'week', limit = 10) {
    let dateFilter = '';
    if (period === 'week') {
        dateFilter = "WHERE r.rated_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
        dateFilter = "WHERE r.rated_at >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    const query = `
        SELECT 
            u.id,
            u.name,
            u.email,
            u.profile_picture,
            AVG(r.rating) as average_rating,
            COUNT(r.id) as total_rooms,
            ${period === 'week' ? "'W' || EXTRACT(WEEK FROM CURRENT_DATE) || '-' || EXTRACT(YEAR FROM CURRENT_DATE)" : "'M' || EXTRACT(MONTH FROM CURRENT_DATE) || '-' || EXTRACT(YEAR FROM CURRENT_DATE)"} as period
        FROM users u
        JOIN ratings r ON u.id = r.employee_id
        ${dateFilter}
        GROUP BY u.id, u.name, u.email, u.profile_picture
        HAVING COUNT(r.id) > 0
        ORDER BY average_rating DESC, total_rooms DESC
        LIMIT $1
    `;
    
    return await getRows(query, [limit]);
}

// Get today's rating tasks
export async function getTodaysRatingTasks() {
    const query = `
        SELECT 
            r.id,
            b.name as building_name,
            f.floor_name,
            rm.room_name,
            u.name as employee_name,
            u.id as employee_id,
            COALESCE(last_rating.rating, 0) as last_rating,
            COALESCE(last_rating.rated_at::date, '1900-01-01'::date) as last_rating_date,
            CASE 
                WHEN r.rated_at >= CURRENT_DATE THEN 'completed'
                ELSE 'pending'
            END as status
        FROM rooms rm
        JOIN floors f ON rm.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        JOIN users u ON u.assigned_building = b.name AND f.floor_name = ANY(u.assigned_floors)
        LEFT JOIN LATERAL (
            SELECT rating, rated_at
            FROM ratings
            WHERE room_id = rm.id
            ORDER BY rated_at DESC
            LIMIT 1
        ) last_rating ON true
        LEFT JOIN LATERAL (
            SELECT rated_at
            FROM ratings
            WHERE room_id = rm.id AND rated_at >= CURRENT_DATE
            LIMIT 1
        ) today_rating ON true
        WHERE u.user_type = 'employee' 
        AND u.is_active = TRUE
        AND b.is_active = TRUE
        AND f.is_active = TRUE
        AND rm.is_active = TRUE
        ORDER BY b.name, f.floor_name, rm.room_name
    `;
    
    return await getRows(query);
}

// Get completed tasks for today
export async function getCompletedTasksToday() {
    const query = `
        SELECT 
            r.id,
            b.name as building_name,
            f.floor_name,
            rm.room_name,
            u.name as employee_name,
            u.id as employee_id,
            r.rating as last_rating,
            r.rated_at::date as last_rating_date,
            'completed' as status
        FROM ratings r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN floors f ON rm.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        JOIN users u ON r.employee_id = u.id
        WHERE r.rated_at >= CURRENT_DATE
        AND u.user_type = 'employee'
        AND u.is_active = TRUE
        ORDER BY r.rated_at DESC
    `;
    
    return await getRows(query);
}

// Get pending tasks for today
export async function getPendingTasksToday() {
    const query = `
        SELECT 
            rm.id,
            b.name as building_name,
            f.floor_name,
            rm.room_name,
            u.name as employee_name,
            u.id as employee_id,
            COALESCE(last_rating.rating, 0) as last_rating,
            COALESCE(last_rating.rated_at::date, '1900-01-01'::date) as last_rating_date,
            'pending' as status
        FROM rooms rm
        JOIN floors f ON rm.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        JOIN users u ON u.assigned_building = b.name AND f.floor_name = ANY(u.assigned_floors)
        LEFT JOIN LATERAL (
            SELECT rating, rated_at
            FROM ratings
            WHERE room_id = rm.id
            ORDER BY rated_at DESC
            LIMIT 1
        ) last_rating ON true
        WHERE u.user_type = 'employee' 
        AND u.is_active = TRUE
        AND b.is_active = TRUE
        AND f.is_active = TRUE
        AND rm.is_active = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM ratings 
            WHERE room_id = rm.id 
            AND rated_at >= CURRENT_DATE
        )
        ORDER BY b.name, f.floor_name, rm.room_name
    `;
    
    return await getRows(query);
}

// Close the pool when the application shuts down
process.on('SIGINT', () => {
    pool.end();
    process.exit(0);
});

export default pool;