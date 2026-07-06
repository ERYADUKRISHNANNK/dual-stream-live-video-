import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Persistence File Paths
const usersFile = path.join(__dirname, "../../mock_db_users.json");
const auditsFile = path.join(__dirname, "../../mock_db_audits.json");
const threatsFile = path.join(__dirname, "../../mock_db_threats.json");
const sessionsFile = path.join(__dirname, "../../mock_db_sessions.json");
const filesFile = path.join(__dirname, "../../mock_db_files.json");

// Helper IO routines
const loadData = (filePath: string): any[] => {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return [];
    }
  }
  return [];
};

const saveData = (filePath: string, data: any[]) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Persistent DB write error to ${filePath}:`, err);
  }
};

// Simulated Document wrapping
const createDocMethods = (item: any, collection: any[], filePath: string) => {
  return {
    ...item,
    save: async function() {
      const idx = collection.findIndex(x => x._id.toString() === this._id.toString());
      if (idx >= 0) {
        collection[idx] = { ...this };
      } else {
        collection.push({ ...this });
      }
      saveData(filePath, collection);
      return this;
    }
  };
};

export class MockUser {
  static async findOne(query: any) {
    const list = loadData(usersFile);
    const user = list.find(u => {
      if (query.username && u.username !== query.username) return false;
      if (query.email && u.email !== query.email) return false;
      if (query.$or) {
        return query.$or.some((sub: any) => {
          if (sub.username && u.username === sub.username) return true;
          if (sub.email && u.email === sub.email) return true;
          return false;
        });
      }
      return true;
    });
    return user ? createDocMethods(user, list, usersFile) : null;
  }

  static async findById(id: any) {
    const list = loadData(usersFile);
    const user = list.find(u => u._id.toString() === id.toString());
    return user ? createDocMethods(user, list, usersFile) : null;
  }

  static async create(data: any) {
    const list = loadData(usersFile);
    const user = {
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
      whitelistedIps: data.whitelistedIps || [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    list.push(user);
    saveData(usersFile, list);
    return createDocMethods(user, list, usersFile);
  }

  static async find() {
    const list = loadData(usersFile);
    return list.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  }
}

export class MockAuditLog {
  static async create(data: any) {
    const list = loadData(auditsFile);
    const log = {
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    list.push(log);
    saveData(auditsFile, list);
    return log;
  }

  static find(query: any = {}) {
    const list = loadData(auditsFile);
    let filtered = [...list];
    if (query.action && query.action.$in) {
      filtered = filtered.filter(l => query.action.$in.includes(l.action));
    }
    
    return {
      sort: () => ({
        limit: (n: number) => filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, n)
      })
    };
  }

  static async countDocuments() {
    return loadData(auditsFile).length;
  }
}

export class MockThreatReport {
  static async create(data: any) {
    const list = loadData(threatsFile);
    const report = {
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
      status: "ACTIVE",
      actionTaken: "FILE_BLOCKED",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    list.push(report);
    saveData(threatsFile, list);
    return report;
  }

  static find() {
    const list = loadData(threatsFile);
    return {
      sort: () => ({
        limit: (n: number) => [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, n)
      })
    };
  }

  static async countDocuments(query: any = {}) {
    const list = loadData(threatsFile);
    if (query.status === "ACTIVE") {
      return list.filter(t => t.status === "ACTIVE").length;
    }
    return list.length;
  }
}

export class MockSessionLog {
  static async create(data: any) {
    const list = loadData(sessionsFile);
    const sess = {
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    list.push(sess);
    saveData(sessionsFile, list);
    return sess;
  }

  static async findOne(query: any) {
    const list = loadData(sessionsFile);
    const sess = list.find(s => s.token === query.token);
    return sess ? createDocMethods(sess, list, sessionsFile) : null;
  }

  static async updateOne(filter: any, update: any) {
    const list = loadData(sessionsFile);
    const sess = list.find(s => s.token === filter.token);
    if (sess) {
      if (update.riskScore !== undefined) sess.riskScore = update.riskScore;
      if (update.keystrokeAvg !== undefined) sess.keystrokeAvg = update.keystrokeAvg;
      if (update.mouseJitterAvg !== undefined) sess.mouseJitterAvg = update.mouseJitterAvg;
      if (update.fingerprint !== undefined) sess.fingerprint = update.fingerprint;
      saveData(sessionsFile, list);
    }
    return { modifiedCount: sess ? 1 : 0 };
  }

  static async countDocuments(query: any = {}) {
    const list = loadData(sessionsFile);
    let count = 0;
    list.forEach(s => {
      if (query.userId && s.userId.toString() !== query.userId.toString()) return;
      if (query.active && s.active !== query.active) return;
      count++;
    });
    return count;
  }
}

export class MockFileDocument {
  static async create(data: any) {
    const list = loadData(filesFile);
    const file = {
      ...data,
      _id: new mongoose.Types.ObjectId().toString(),
      isLocked: false,
      isRecycled: false,
      sharedWith: data.sharedWith || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    list.push(file);
    saveData(filesFile, list);
    return createDocMethods(file, list, filesFile);
  }

  static async findById(id: any) {
    const list = loadData(filesFile);
    const file = list.find(f => f._id.toString() === id.toString());
    return file ? createDocMethods(file, list, filesFile) : null;
  }

  static find(query: any = {}) {
    const list = loadData(filesFile);
    const userList = loadData(usersFile);
    let filtered = [...list];
    
    if (query.$or) {
      const ownerId = query.$or[0].owner;
      const accessorId = query.$or[1]["sharedWith.accessor"];
      
      filtered = filtered.filter(f => 
        (f.owner.toString() === ownerId.toString()) || 
        f.sharedWith.some((s: any) => s.accessor && s.accessor.toString() === accessorId.toString())
      );
    }
    
    const mockPopulate = () => {
      return filtered.map(f => {
        const ownerObj = userList.find(u => u._id.toString() === f.owner.toString());
        return {
          ...f,
          owner: ownerObj ? { _id: ownerObj._id, username: ownerObj.username, email: ownerObj.email } : f.owner
        };
      });
    };

    return {
      populate: mockPopulate
    };
  }

  static async findByIdAndDelete(id: any) {
    const list = loadData(filesFile);
    const idx = list.findIndex(f => f._id.toString() === id.toString());
    if (idx >= 0) {
      const deleted = list.splice(idx, 1)[0];
      saveData(filesFile, list);
      return deleted;
    }
    return null;
  }

  static async countDocuments() {
    return loadData(filesFile).length;
  }
}
