import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private readonly db: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | null> {
    return this.db.get(id) ?? null;
  }

  async createUser(name: string, email: string): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = { id, name, email };
    this.db.set(id, user);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.db.delete(id);
  }
}

function validateEmail(email: string): boolean {
  return email.includes("@");
}

export default UserService;
