import test from 'tape';
import { readClaims, verifyClaim } from '../lib';
import jwt from 'jsonwebtoken';

const tokenSecret = 'shhhhhh';

test('readClaims evaluates cookies', (t) => {
  t.plan(1);
  const cookies = {};
  cookies['nocms-authenticated'] = jwt.sign({ foo: 1 }, tokenSecret);

  const req = {};
  const res = {};
  req.cookies = cookies;
  readClaims(tokenSecret)(req, res, () => {
    t.equals(res.locals.tokenValid, true);
  });
});

test('readClaims evaluates authorization header', (t) => {
  t.plan(1);
  const token = jwt.sign({ foo: 1 }, tokenSecret);
  const headers = { authorization: `Bearer ${token}` };
  
  const req = { headers };
  const res = {};
  readClaims(tokenSecret)(req, res, () => {
    t.equals(res.locals.tokenValid, true);
  });
});

test('readClaims should proceed on invalid tokens', (t) => {
  t.plan(1);
  const headers = { authorization: `Bearer I am not a valid token` };
  
  const req = { headers };
  const res = {};
  readClaims(tokenSecret)(req, res, () => {
    t.equals(res.locals.tokenValid, false);
  });
});

test('readClaims should put claims on locals', (t) => {
  t.plan(1);
  const token = jwt.sign({ claims: { foo: 1 } }, tokenSecret);
  const headers = { authorization: `Bearer ${token}` };
  
  const req = { headers };
  const res = {};
  readClaims(tokenSecret)(req, res, () => {
    t.equals(res.locals.claims.foo, 1);
  });
});

test('readClaims should put an authorization header on locals', (t) => {
  t.plan(1);
  const cookies = {};
  const token = jwt.sign({ foo: 1 }, tokenSecret);
  cookies['nocms-authenticated'] = token;

  const req = { cookies, };
  const res = {};

  readClaims(tokenSecret)(req, res, () => {
    t.equals(res.locals.authorizationHeader, `Bearer ${token}`);
  });
});

test('verify claim should continue on valid claims', (t) => {
  t.plan(1);
  const req = {};
  const res = { locals: { claims: { foo: true }, tokenValid: true }};

  verifyClaim('foo')(req, res, () => {
    t.pass();
  });
});

test('verify claim should return status 401 on invalid tokens', (t) => {
  t.plan(4);
  const req = {};
  let res;
  const status = (code) => { t.equals(code, 401); return res; };
  const append = (header, value) => {
    t.equals(header, 'WWW-Authenticate');
    t.equals(value, 'Reauth');
    return res;
  };

  const send = (text) => {
    t.equals(text, '401 Unauthorized');
    return res;
  };

  res = { locals: { tokenValid: false }, status, append, send };

  verifyClaim('foo')(req, res, () => {
    t.fail();
  });
});

test('verify claim should return status 403 on missing claims', (t) => {
  t.plan(2);
  const req = {};
  let res;
  const status = (code) => { t.equals(code, 403); return res; };

  const send = (text) => {
    t.equals(text, '403 Forbidden');
    return res;
  };

  res = { locals: { tokenValid: true, claims: {} }, status, send };

  verifyClaim('foo')(req, res, () => {
    t.fail();
  });
});