
import { StateStorageAdapter } from './StateStorageAdapter';

const validName = (nameString) => typeof nameString === 'string' && nameString.length > 0;

const validNameValuePair = (nameAndValue) => {
  let isValid = false;

  if (nameAndValue instanceof Array && nameAndValue.length >= 2) {
    const [name] = nameAndValue;
    isValid = validName(name);
  }

  return isValid
};

/**
 * @private
 * @ignore
 * @param batch
 * @return {Error|null}
 */
const validateNameValuePairsList = (batch) => {
  if (! batch instanceof Array || batch.length === 0) {
    return new Error('In batch mode, the first parameter must be a non-empty Array');
  }

  const invalidPairs = batch.filter((nameAndValue) => !validNameValuePair(nameAndValue));
  if (invalidPairs.length) {
    return new Error('Bad method call: some of the name and value pairs were invalid. A name-value pair should have a non empty name and a value');
  }

  return null;
};

/**
 * @class
 */
class StateApiFacade
{
  /**
   * @param {EventDispatcher} eventDispatcher
   * @param {StateStorageAdapter} storageAdapter
   * @param {String} instanceId
   * @param {String} contextEntityType
   * @param {String} contextEntityId
   * @param {String} appId
   * @param other
   */
  constructor(eventDispatcher, storageAdapter, { instanceId, contextEntityType, contextEntityId, appId, ...other }) {
    if (! storageAdapter instanceof StateStorageAdapter) {
      throw new Error('param storageAdapter must be an instance of StateStorageAdapter');
    }
    this.props = { eventDispatcher, storageAdapter, instanceId, contextEntityType, contextEntityId, appId, ...other };
  }

  /**
   * @public
   * @method
   *
   * @param args
   * @return {Promise}
   */
  async setState(...args) {
    const { storageAdapter } = this.props;

    if (args.length === 3) { //
      const [name, value, entityId] = args;
      if (! validName(name)) {
        throw new Error('Bad method call: name parameter must be a non empty string');
      }

      return storageAdapter.handleSetState(Promise.resolve(this.props), name, value, entityId);
    }

    if (args.length === 2) {
      const [batch, entityId] = args;
      const batchError = validateNameValuePairsList(batch);
      if (batchError instanceof Error) {
        throw batchError;
      }

      return storageAdapter.handleSetBatchState(Promise.resolve(this.props), batch, entityId);
    }

    throw new Error(`Bad method call: unknown number of args: ${args.length}`);
  }

  /**
   * @public
   * @method
   *
   * @param args
   * @return {Promise}
   */
  async setAppState(...args) {
    const entityId = `app:${this.props.appId}`;
    if (args.length == 2) {
      const [ name, value ] = args;
      return this.setState(name, value, entityId);
    }

    if (args.length == 1) {
      const [ batch ] = args;
      return this.setState(batch, entityId);
    }

    throw new Error(`Bad method call: unknown number of args: ${args.length}`);
  }

  /**
   * @public
   * @method
   *
   * @return {Promise}
   */
  async setEntityState(...args) {
    const entityId = `${this.props.contextEntityType}:${this.props.contextEntityId}`;
    if (args.length == 2) {
      const [ name, value ] = args;
      return this.setState(name, value, entityId);
    }

    if (args.length == 1) {
      const [ batch ] = args;
      return this.setState(batch, entityId);
    }

    throw new Error(`Bad method call: unknown number of args: ${args.length}`);
  }

  /**
   * @public
   * @method
   *
   * @param {string|Array<string>}name
   * @param {string} entityId
   * @param {*} defaultValue
   * @return {Promise}
   */
  async getState(name, entityId, defaultValue = null) {
    const { storageAdapter } = this.props;

    if (validName(name)) {
      return storageAdapter.handleGetState(Promise.resolve(this.props), name, entityId, defaultValue || null)
    }

    const batch = name;
    if (batch instanceof Array) {
      if (batch.length === 0) {
        throw new Error('In batch mode, the first parameter must be a non-empty Array');
      }

      const invalidName = batch.filter((nameString) => !validName(nameString));
      if (invalidName.length) {
        throw new Error('Bad method call: some names were not syntactically valid');
      }
      return storageAdapter.handleGetBatchState(Promise.resolve(this.props), batch, entityId, defaultValue || null)
    }

    throw new Error('Bad method call');
  }

  /**
   * @public
   * @method
   *
   * @param name
   * @param defaultValue
   * @return {Promise}
   */
  async getEntityState(name, defaultValue = null) {
    const entityId = `${this.props.contextEntityType}:${this.props.contextEntityId}`;
    return this.getState(name, entityId, defaultValue);
  }

  /**
   * @public
   * @method
   *
   * @param name
   * @param defaultValue
   * @return {Promise}
   */
  async getAppState(name, defaultValue = null) {
    const entityId = `app:${this.props.appId}`;
    return this.getState(name, entityId, defaultValue);
  }

}

export {
  StateApiFacade
};