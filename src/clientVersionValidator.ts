import semver from 'semver';

export default class ClientVersionValidator {
  requirements = "0.2.x"

  validate(version?: string): boolean {
    return (!!version) && semver.satisfies(version, this.requirements)
  }
}