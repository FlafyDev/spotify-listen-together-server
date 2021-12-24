import semver from 'semver';
import config from '../config';

export default class ClientVersionValidator {
  validate(version?: string): boolean {
    return (!!version) && semver.satisfies(version, config.clientVersionRequirements)
  }
}