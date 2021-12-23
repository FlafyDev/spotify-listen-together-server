import semver from 'semver';

export default class ClientVersionValidator {
  requirements = "0.3.0"

  validate(version?: string): boolean {
    return (!!version) && semver.satisfies(version, this.requirements)
  }
}