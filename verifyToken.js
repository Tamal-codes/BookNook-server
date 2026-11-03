import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Token missing" });
  }

  const token = header.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, jwks);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).send({ message: "Invalid token" });
  }
}