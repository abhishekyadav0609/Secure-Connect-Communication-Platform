const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

async function authenticateToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Access denied. Bearer token required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!ObjectId.isValid(decoded.userId)) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    const user = await getDB().collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(401).json({ message: "User no longer exists." });

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions." });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
