import 'reflect-metadata';
import { existsSync, mkdirSync } from 'fs';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import createFileStore from 'session-file-store';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy, VerifiedCallback } from 'passport-saml';
import bodyParser from 'body-parser';
import { useExpressServer, getMetadataArgsStorage } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import swaggerUi from 'swagger-ui-express';
import {
  NODE_ENV,
  PORT,
  SWAGGER_ENABLED,
  LOG_FORMAT,
  ORIGIN,
  CREDENTIALS,
  SECRET_KEY,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_SUCCESS_REDIRECT,
  SAML_FAILURE_REDIRECT,
  SAML_LOGOUT_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  BASE_URL_PREFIX,
  SESSION_MEMORY,
} from '@config';
import errorMiddleware from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import { Profile } from './interfaces/profile.interface';
import ApiService from '@/services/api.service';
import { HttpException } from './exceptions/HttpException';
import { join } from 'path';
import { Contractor, User } from './interfaces/users.interface';

const SessionStoreCreate = SESSION_MEMORY ? createMemoryStore(session) : createFileStore(session);
const sessionTTL = 4 * 24 * 60 * 60;
// NOTE: memory uses ms while file uses seconds
const sessionStore = new SessionStoreCreate(SESSION_MEMORY ? { checkPeriod: sessionTTL * 1000 } : { sessionTTL, path: './data/sessions' });

const apiService = new ApiService();

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

const samlStrategy = new Strategy(
  {
    disableRequestedAuthnContext: true,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    callbackUrl: SAML_CALLBACK_URL,
    entryPoint: SAML_ENTRY_SSO,
    privateKey: SAML_PRIVATE_KEY,
    // Identity Provider's public key
    cert: SAML_IDP_PUBLIC_CERT,
    issuer: SAML_ISSUER,
    wantAssertionsSigned: false,
    logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL,
  },
  async function (profile: Profile, done: VerifiedCallback) {
    if (!profile) {
      return done({
        name: 'SAML_MISSING_PROFILE',
        message: 'Missing SAML profile',
      });
    }
    const { givenName, surname, username, groups } = profile;

    if (!givenName || !surname || !username || !groups) {
      return done({
        name: 'SAML_MISSING_ATTRIBUTES',
        message: 'Missing profile attributes',
      });
    }

    try {
      const userGroups = groups ? groups.split(',') : [];
      const isSuperAdmin = userGroups.includes('SG_Appl_LOV_InternalAdmin');
      const isAdmin = userGroups.includes('SG_Appl_LOV_ExternalAdmin');

      if (!isAdmin && !isSuperAdmin) {
        return done({
          name: 'MISSING_SG_GROUPS',
          message: 'Not allowed to enter',
        });
      }

      if (isSuperAdmin) {
        const employee = await apiService.get<any>({ url: `employee/1.0/portalpersondata/personal/${username}` });
        const { personid: personId } = employee.data;

        const findUser: User = {
          guid: personId,
          name: `${givenName} ${surname}`,
          givenName: givenName,
          surname: surname,
          username: username,
          personId,
          isSuperAdmin,
          isAdmin,
        };
        return done(null, findUser);
      }

      const metaUser = await apiService.get<Contractor[]>({ url: `/metaadmin/1.0/contractor/loginname/${username}` });

      if (metaUser.data.length <= 0) {
        return done({
          name: 'MISSING_IN_METAADMIN',
          message: 'Missing user in meta admin',
        });
      }

      const { personId, orgId, orgName, retireDate } = metaUser.data[0];

      const contracts = metaUser.data.map(contract => ({
        personId: contract.personId,
        contractId: contract.contractId,
        orgId: contract.orgId,
        orgName: contract.orgName,
        isEmergencyClosed: contract.isEmergencyClosed,
        hireDate: contract.hireDate,
        retireDate: contract.retireDate,
      }));

      const findUser: User = {
        guid: personId,
        name: `${givenName} ${surname}`,
        givenName: givenName,
        surname: surname,
        username: username,
        isSuperAdmin,
        isAdmin,
        orgId,
        orgName,
        retireDate,
        personId,
        contracts,
      };

      done(null, findUser);
    } catch (err) {
      if (err instanceof HttpException && err?.status === 404) {
        // TODO: Handle missing person form Citizen?
      }
      done(err);
    }
  },
);

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  public swaggerEnabled: boolean;

  constructor(Controllers: Function[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;
    this.swaggerEnabled = SWAGGER_ENABLED || false;

    this.initializeDataFolders();

    this.initializeMiddlewares();
    this.initializeRoutes(Controllers);
    if (this.swaggerEnabled) {
      this.initializeSwagger(Controllers);
    }
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use(
      session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
      }),
    );

    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.use('saml', samlStrategy);

    this.app.get(
      `${BASE_URL_PREFIX}/saml/login`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        }
        next();
      },
      (req, res, next) => {
        passport.authenticate('saml', {
          failureRedirect: SAML_FAILURE_REDIRECT,
        })(req, res, next);
      },
    );

    this.app.get(`${BASE_URL_PREFIX}/saml/metadata`, (req, res) => {
      res.type('application/xml');
      const metadata = samlStrategy.generateServiceProviderMetadata(SAML_PUBLIC_KEY, SAML_PUBLIC_KEY);
      res.status(200).send(metadata);
    });

    this.app.get(`${BASE_URL_PREFIX}/saml/logout`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      samlStrategy.logout(req as any, () => {
        req.logout(err => {
          if (err) {
            return next(err);
          }
          // FIXME: should we redirect here or should client do it?
          res.redirect(SAML_LOGOUT_REDIRECT);
        });
      });
    });

    this.app.get(`${BASE_URL_PREFIX}/saml/logout/callback`, bodyParser.urlencoded({ extended: false }), (req, res, next) => {
      // FIXME: is this enough or do we need to do something more?
      req.logout(err => {
        if (err) {
          return next(err);
        }
        // FIXME: should we redirect here or should client do it?
        res.redirect(SAML_LOGOUT_REDIRECT);
      });
    });

    this.app.post(
      `${BASE_URL_PREFIX}/saml/login/callback`,
      bodyParser.urlencoded({ extended: false }),
      (req, res, next) => {
        passport.authenticate('saml', {
          failureRedirect: SAML_FAILURE_REDIRECT,
        })(req, res, next);
      },
      (req, res, next) => {
        res.redirect(SAML_SUCCESS_REDIRECT);
      },
    );
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      cors: {
        origin: ORIGIN,
        credentials: CREDENTIALS,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      },
      controllers: controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger(controllers: Function[]) {
    const schemas = validationMetadatasToSchemas({
      classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: '#/components/schemas/',
    });

    const routingControllersOptions = {
      controllers: controllers,
    };

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(storage, routingControllersOptions, {
      components: {
        schemas: schemas as { [schema: string]: unknown },
        securitySchemes: {
          basicAuth: {
            scheme: 'basic',
            type: 'http',
          },
        },
      },
      info: {
        description: 'Web App Starter',
        title: 'API',
        version: '1.0.0',
      },
    });

    this.app.use(`${BASE_URL_PREFIX}/api-docs`, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeDataFolders() {
    const databaseDir: string = join(__dirname, '../data/database');
    if (!existsSync(databaseDir)) {
      mkdirSync(databaseDir, { recursive: true });
    }
    const logsDir: string = join(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    const sessionsDir: string = join(__dirname, '../data/sessions');
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }
  }
}

export default App;
