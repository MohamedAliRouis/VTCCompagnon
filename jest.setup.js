/* eslint-env jest */
/* Mock AsyncStorage : évite l'erreur "Native module is null" dans les tests
   qui touchent la couche de persistance (bootstrap, stores). */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key =>
        Promise.resolve(Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      ),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
});
