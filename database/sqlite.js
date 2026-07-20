const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require("bcrypt");


async function CreateTables() {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    try {
        await db.exec('PRAGMA foreign_keys = ON;');

        await db.exec(`CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        bio TEXT,
        gender TEXT NOT NULL,
        role TEXT NOT NULL,
        city TEXT,
        country TEXT,
        github TEXT,
        linkedin TEXT,
        portfolio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.exec(`CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        targetId INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(userId) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY(targetId) REFERENCES profiles(id) ON DELETE CASCADE
        )`);

        await db.exec(`CREATE TABLE IF NOT EXISTS interests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        targetId INTEGER NOT NULL,
        approved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(userId) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY(targetId) REFERENCES profiles(id) ON DELETE CASCADE
        )`);

        await db.exec(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        message TEXT NOT NULL,
        sender INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY(chatId) REFERENCES chats(id) ON DELETE CASCADE
        )`);
    } finally {
        await db.close();
    }
}

async function addDummyData(query) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const registeredUserDetails = await db.run(`-- Dummy data for profiles table
INSERT INTO profiles (username, email, password, bio, gender, role, city, country, github, linkedin, portfolio) VALUES
('dev_johndoe', 'john.doe@example.com', 'hashed_password_1', 'Passionate full-stack developer interested in open-source projects.', 'Male', 'Developer', 'London', 'UK', 'github.com/johndoe', 'linkedin.com/in/johndoe', 'johndoe.dev'),
('design_janedoe', 'jane.doe@example.com', 'hashed_password_2', 'UI/UX designer with a keen eye for detail and user-centered design.', 'Female', 'Designer', 'Berlin', 'Germany', 'github.com/janedoe', 'linkedin.com/in/janedoe', 'janedoe.design');

-- Dummy data for chats table (assuming profile IDs 1 and 2 from above)
INSERT INTO chats (userId, targetId) VALUES
(1, 2);

-- Dummy data for interests table (assuming profile IDs 1 and 2 from above)
INSERT INTO interests (userId, targetId, approved) VALUES
(1, 2, 1), -- John is interested in Jane, approved
(2, 1, 0); -- Jane is interested in John, pending approval

-- Dummy data for messages table (assuming chat ID 1 from above, between userId 1 and targetId 2)
INSERT INTO messages (chatId, message, sender) VALUES
(1, 'Hi Jane, I really liked your portfolio!', 1),
(1, 'Thanks, John! I appreciate that. Your GitHub projects are impressive too.', 2),
(1, 'Looking forward to connecting more!', 1);`)
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function CreateProfile(user) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        user.password = await bcrypt.hash(user.password, 10);
        const registeredUserDetails = await db.run(`INSERT INTO profiles (username, email, password, gender, role) values (?, ?, ?, ?, ?)`,
             [user.username, user.email, user.password, user.gender, user.role]);
        const registeredUser = await db.get(`SELECT * FROM profiles WHERE id = ?`, [registeredUserDetails.lastID]);
        return registeredUser;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function UpdateProfile(userId, data) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const updates = [];
        const values = [];

        if (data.username) {
            updates.push("username = ?");
            values.push(data.username);
        }
        if (data.email) {
            updates.push("email = ?");
            values.push(data.email);
        }
        if (data.gender) {
            updates.push("gender = ?");
            values.push(data.gender);
        }
        if (data.role) {
            updates.push("role = ?");
            values.push(data.role);
        }
        if (data.city) {
            updates.push("city = ?");
            values.push(data.city);
        }
        if (data.country) {
            updates.push("country = ?");
            values.push(data.country);
        }
        if (data.bio) {
            updates.push("bio = ?");
            values.push(data.bio);
        }
        if (data.password) {
            const hash = await bcrypt.hash(data.password, 10);
            updates.push("password = ?");
            values.push(hash);
        }
        if (data.github) {
            updates.push("github = ?");
            values.push(data.github);
        }
        if (data.linkedin) {
            updates.push("linkedin = ?");
            values.push(data.linkedin);
        }
        if (data.portfolio) {
            updates.push("portfolio = ?");
            values.push(data.portfolio);
        }

        if (updates.length === 0) {
            throw new Error("No fields to update");
        }

        values.push(userId);

        await db.run(
            `UPDATE profiles
             SET ${updates.join(", ")}
             WHERE id = ?`,
            values
        );
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function Login(user) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const registeredUser = await db.get(`SELECT * FROM profiles WHERE email = ?`, [user.email]);
        if (!registeredUser) {
            throw new Error('Incorrect Email');
        }
        const match = await bcrypt.compare(
            user.password,
            registeredUser.password
        );
        if (!match) {
            throw new Error("Incorrect password");
        }
        return registeredUser;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetProfile(id) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const registeredUser = await db.get(`SELECT * FROM profiles WHERE id = ?`, [id]);
        
        if (!registeredUser) {
            throw new Error('Profile does not exists anymore');
        }
        delete registeredUser.id;
        delete registeredUser.password;
        delete registeredUser.create_at;
        return registeredUser;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function CreateInterest(userId, targetId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        await db.run(`INSERT INTO interests (userId, targetId) values (?, ?)`, [userId, targetId]);
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function DeleteProfile(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        await db.run(`DELETE FROM profiles WHERE id = ?`, [userId]);
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetAllProfiles(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const users = await db.all(`SELECT id, username, gender, bio, role, city, country, github, linkedin, portfolio FROM profiles WHERE id != ?`, [userId]);
        return users;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetSpecificProfiles(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const user = await db.get(`SELECT id, username, gender, role, city, country FROM profiles WHERE id = ?`, [userId]);
        return user;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function SendMessage(chatId, message, sender) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        await db.run(`INSERT INTO messages (chatId, message, sender) values(?, ?, ?)`, [chatId, message, sender]);
        return {
            message: message,
            chatId: chatId,
            sender: sender
        }
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetMessages(chatId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const messages = await db.all(`SELECT * FROM messages WHERE chatId = ?`, [chatId]);
        return messages;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetChatId(userId, targetId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const chatId = await db.get(`SELECT id FROM chats WHERE userId IN (?, ?) AND targetId IN (?, ?)`, [userId, targetId, userId, targetId]);
        if (chatId) {
            return chatId;
        } else {
            const result = await db.run(`INSERT INTO chats (userId, targetId) VALUES (?, ?)`, [userId, targetId]);
            return {id: result.lastID};
        }
        
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetInterests(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const interests = await db.all(`SELECT userId, targetId FROM interests WHERE userId = ?`, [userId]);
        return interests;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetInterestedButNotApproved(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const interests = await db.all(`SELECT profiles.id, profiles.username, profiles.role FROM interests
            INNER JOIN profiles ON interests.userId = profiles.id
            WHERE targetId = ? AND approved = 0`,
             [userId]);
        return interests;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function GetInterested(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const interests = await db.all(`SELECT profiles.id, profiles.username, profiles.role, interests.approved FROM interests
            INNER JOIN profiles ON interests.userId = profiles.id
            WHERE targetId = ?`,
             [userId]);
        return interests;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}
async function GetInterestsOnlyApproved(userId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        const interestsListOne = await db.all(`SELECT profiles.id, profiles.username, profiles.role FROM interests
            INNER JOIN profiles ON interests.userId = profiles.id
            WHERE targetId = ? AND approved = 1`,
             [userId]);
        const interestsListTwo = await db.all(`SELECT profiles.id, profiles.username, profiles.role FROM interests
            INNER JOIN profiles ON interests.targetId = profiles.id
            WHERE userId = ? AND approved = 1`,
             [userId]);
             const interests = [...interestsListOne, ...interestsListTwo];
        return interests;
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}

async function ShowInterest(userId, targetId) {
    const db = await open({
        filename: './database/data.db',
        driver: sqlite3.Database
    });
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
        await db.run(`UPDATE interests SET approved = 1 WHERE targetId = ? AND userId = ?`, [userId, targetId]);
    } catch (error) {
        throw error;
    } finally {
        await db.close();
    }
}



module.exports = {
    CreateTables, CreateProfile, Login, GetProfile, CreateInterest, DeleteProfile, GetAllProfiles, GetSpecificProfiles, SendMessage,
    GetMessages, GetInterests, GetInterestedButNotApproved, ShowInterest, GetInterested, UpdateProfile, GetInterestsOnlyApproved,
    GetChatId, addDummyData
};