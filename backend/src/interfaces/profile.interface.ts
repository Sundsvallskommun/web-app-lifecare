import { Profile as SamlProfile } from 'passport-saml';

export interface Profile extends SamlProfile {
  givenName: string;
  surname: string;
  username: string;
  groups: string;
  attributes: { [key: string]: any };
}
