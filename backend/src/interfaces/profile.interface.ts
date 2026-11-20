import { Profile as SamlProfile } from '@node-saml/passport-saml';

export interface Profile extends SamlProfile {
  givenname?: string;
  givenName?: string;
  surname: string;
  uid: string;
  groups: string;
  attributes: { [key: string]: any };
}
