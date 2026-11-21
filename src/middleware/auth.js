import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

const USERS_COLLECTION = "users";

let jwks;
function getJWKS() {
  if (!jwks) {
    if (!process.env.AUTH_JWKS_URL) {
      throw new Error("AUTH_JWKS_URL is not set");
    }
    // jose caches the keys and refetches when needed
    jwks = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
  }
  return jwks;
}

function toUserId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

export async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Authentication required");
    }

    const keys = getJWKS(); // config errors should surface as 500, not 401

    let payload;
    try {
      ({ payload } = await jwtVerify(token, keys, {
        issuer: process.env.AUTH_ISSUER,
        audience: process.env.AUTH_ISSUER,
      }));
    } catch {
      throw new HttpError(401, "Invalid or expired token");
    }

    const userId = payload.sub || payload.id;
    if (!userId) throw new HttpError(401, "Invalid token payload");

    // Always check the database, never trust role/blocked from the token
    const user = await getDB()
      .collection(USERS_COLLECTION)
      .findOne({ _id: toUserId(userId) });

    if (!user) throw new HttpError(401, "User not found");
    if (user.isBlocked) {
      throw new HttpError(403, "Your account has been blocked. Contact support.");
    }

    req.user = {
      _id: user._id, // raw id, used when storing references
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image || null,
      phone: user.phone || "",
      role: user.role || "customer",
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, "You do not have permission to perform this action")
      );
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireCustomer = requireRole("customer");