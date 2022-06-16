'use strict';

const Chance = require('chance');
const util = require('util');
const Errors = require('./errors');

const chance = new Chance();

const generateError = () => {
  return {
    code: chance.word().toUpperCase(),
    message: chance.sentence(),
    status: chance.integer({ max: 9999, min: 1000 })
  };
};

describe('lib/errors', () => {
  describe('Constructor', () => {
    it('should create a valid error instance', () => {
      const e = new Errors();

      expect(e).toBeDefined();
      expect(e).toEqual(expect.any(Errors));
      expect(e).toEqual(expect.any(Error));
    });

    it('should create a throwable error instance', () => {
      const message = chance.sentence();

      const throwFunc = () => {
        throw new Errors(message);
      };

      expect(throwFunc).toThrow(Errors, message);
      expect(throwFunc).toThrow(Error, message);
    });

    it('should accept empty arguments', () => {
      const e = new Errors();

      expect(e).toBeDefined();
      expect(e.toJSON(true)).toEqual({ errors: [{ message: '' }] });
    });

    it('should accept a string as the message', () => {
      const message = chance.sentence();
      const e = new Errors(message);

      expect(e).toBeDefined();
      expect(e.toJSON(true)).toEqual({ errors: [{ message }] });
    });

    it('should accept an object with the error details', () => {
      const details = generateError();
      const e = new Errors(details);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [details] });
    });

    it('should accept an object with details', () => {
      const details = generateError();
      details.details = { foo: chance.name() };
      const e = new Errors(details);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [details] });
    });

    it('should accept an object with links', () => {
      const details = generateError();
      details.links = { source: chance.url() };
      const e = new Errors(details);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [details] });
    });

    it('should accept an object with status code', () => {
      const details = generateError();
      const { code, message, status } = details;
      const e = new Errors(details);
      const statusCode = chance.integer({ max: 599, min: 400 });
      e.errors[0].statusCode = statusCode;

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [{ code, message, status }] });
    });

    it('should accept an object with no stack', () => {
      const details = generateError();
      const e = new Errors(details);

      delete e.stack;

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [details] });
    });

    it('should remove non-standard properties from an object', () => {
      const orgDetails = generateError();
      const details = { ...orgDetails, bar: chance.word(), foo: chance.word() };
      const e = new Errors(details);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [orgDetails] });
    });

    it('should not accept an standarized error object', () => {
      const obj = { errors: [generateError()] };
      const e = new Errors(obj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [{ message: '' }] });
    });

    it('should not accept an standarized error object with more than one error', () => {
      const obj = { errors: [] };
      const randomCount = Math.floor(Math.random() * 10) + 2;

      for (let i = 0; i < randomCount; i += 1) {
        obj.errors.push(generateError());
      }

      const e = new Errors(obj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [{ message: '' }] });
    });

    it('should accept an instance of the same class but only keep the top level data', () => {
      const originalError = new Errors(generateError()).append(new Errors(generateError()));

      const e = new Errors(originalError);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [originalError.toObject().errors[0]] });
    });

    it('should accept an errors-like object which serializes to null', () => {
      const obj = {
        toObject: () => null
      };

      const e = new Errors(obj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [{ message: '' }] });
    });

    it('should not accept an errors-like object which returns weird data', () => {
      const anErr = {
        details: {
          isArray: false
        },
        message: 'Bet you were expecting an array'
      };
      const obj = {
        toObject: () => anErr
      };

      const e = new Errors(obj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [{ message: '' }] });
    });
  });

  describe('Append Function', () => {
    it('should be chainable', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const msg = chance.sentence();
      const f = e.append(msg);

      expect(e).toBe(f);
    });

    it('should be able to append a message', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const message = chance.sentence();

      e.append({ errors: [{ message }] });

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, { message }] });
    });

    it('should be able to append an object with the error details', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const secondObj = generateError();

      e.append({ errors: [secondObj] });

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, secondObj] });
    });

    it('should be able to append an standarized error object', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const secondObj = { errors: [generateError()] };

      e.append(secondObj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, secondObj.errors[0]] });
    });

    it('should be able to append an standarized error object with more than one error', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const secondObj = { errors: [] };
      const randomCount = Math.floor(Math.random() * 10) + 2;

      for (let i = 0; i < randomCount; i += 1) {
        secondObj.errors.push(generateError());
      }

      e.append(secondObj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, ...secondObj.errors] });
    });

    it('should not throw an exception if trying to self-append', () => {
      const e = new Errors();

      const f = () => e.append(e);

      expect(f).not.toThrow(TypeError);
      expect(f()).toBe(e);
    });

    it('should be able to append an error instance', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const secondObj = generateError();

      e.append(new Errors(secondObj));

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, secondObj] });
    });

    it('should be able to append an error instance with more than one error', () => {
      const obj = generateError();
      const e = new Errors(obj);
      const secondObj = { errors: [] };
      const randomCount = Math.floor(Math.random() * 10) + 2;

      for (let i = 0; i < randomCount; i += 1) {
        secondObj.errors.push(generateError());
      }

      e.append(secondObj);

      expect(e).toBeDefined();
      expect(e.toObject()).toEqual({ errors: [obj, ...secondObj.errors] });
    });

    it('should do nothing and return the error', () => {
      const e = new Errors();

      const objBeforeAppend = e.toObject();
      const f = e.append();
      const objAfterAppend = e.toObject();

      expect(objBeforeAppend).toEqual(objAfterAppend);
      expect(e).toBe(f);
    });

    it('should do nothing and return the same error', () => {
      const obj = generateError();
      obj.toObject = () => obj;

      const e = new Errors();

      const errBeforeAppend = e.toObject();
      const f = e.append(obj);
      const errAfterAppend = e.toObject();

      expect(errBeforeAppend).toEqual(errAfterAppend);
      expect(e).toBe(f);
    });
  });

  describe('toString Function', () => {
    it('should generate a string that matches util.inspect', () => {
      const obj = generateError();
      const e = new Errors(obj);

      expect(e.toString()).toEqual(util.inspect(e));
    });

    it('should generate a string that matches util.inspect disregarding code', () => {
      const { message } = generateError();
      const e = new Errors({ message });

      expect(e.toString()).toEqual(util.inspect(e));
    });

    it('should generate an empty stack string', () => {
      const { message } = generateError();
      const e = new Errors({ message });
      delete e.stack;

      expect(e.toString()).toEqual(util.inspect(e));
    });
  });

  describe('toJSON Function', () => {
    it('should return a stringified object', () => {
      const message = chance.sentence();
      const e = new Errors(message);

      const expectedObjectString = JSON.stringify({ errors: [{ message }] });
      expect(e).toBeDefined();
      expect(e.toJSON()).toEqual(expectedObjectString);
    });

    it('should return a plain object', () => {
      const message = chance.sentence();
      const e = new Errors(message);

      const expectedObjectString = { errors: [{ message }] };
      expect(e).toBeDefined();
      expect(e.toJSON(true)).toEqual(expectedObjectString);
    });
  });

  describe('Getting and Setting Data', () => {
    it('set should be chainable', () => {
      const e = new Errors();
      const f = e.set('code', chance.word().toUpperCase());

      expect(e).toBe(f);
    });

    it('should be able to get a property by the key', () => {
      const details = generateError();
      const e = new Errors(details);

      expect(e.get('status')).toBe(details.status);
      expect(e.get('code')).toBe(details.code);
      expect(e.get('message')).toBe(details.message);
    });

    it('should get the whole plain object', () => {
      const obj = generateError();
      const e = new Errors(obj);

      expect(e.get()).toEqual(obj);
    });

    it('should be able to set a property by the key', () => {
      const e = new Errors();
      const code = chance.word().toUpperCase();
      const message = chance.sentence();

      e.set('code', code);
      e.set('message', message);

      expect(e.get('code')).toBe(code);
      expect(e.get('message')).toBe(message);
    });

    it('should be able to set all properties', () => {
      const e = new Errors();
      const obj = generateError();

      e.set(obj);

      expect(e.get('status')).toBe(obj.status);
      expect(e.get('code')).toBe(obj.code);
      expect(e.get('message')).toBe(obj.message);
    });

    it('should not set anything and return the object as is', () => {
      const obj = generateError();
      const e = new Errors();

      const f = e.set(obj, 'test value');

      expect(e.get('status')).toBeUndefined();
      expect(e.get('code')).toBeUndefined();
      expect(e.get('message')).toBe('');
      expect(e).toBe(f);
    });
  });

  describe('Static Methods', () => {
    describe('isError', () => {
      it('should report that an instance of this class is an ohcm-error', () => {
        const e = new Errors();
        expect(Errors.isError(e)).toBe(true);
      });

      it('should report that a normal error is not an ohcm-error', () => {
        const e = new Error();
        expect(Errors.isError(e)).toBe(false);
      });

      it('should report that an instance of ohcm-errors with a separate constructor is an ohcm-error', () => {
        const ErrorsX = Errors.bind({});
        const e = new ErrorsX();
        expect(Errors.isError(e)).toBe(true);
      });
    });

    describe.each`
      code                       | method                   | status
      ${'UNAUTHORIZED'}          | ${'unauthorized'}        | ${401}
      ${'BAD_REQUEST'}           | ${'badRequest'}          | ${400}
      ${'FORBIDDEN'}             | ${'forbidden'}           | ${403}
      ${'NOT_FOUND'}             | ${'notFound'}            | ${404}
      ${'INTERNAL_SERVER_ERROR'} | ${'internalServerError'} | ${500}
      ${'METHOD_NOT_ALLOWED'}    | ${'methodNotAllowed'}    | ${405}
      ${'SERVICE_UNAVAILABLE'}   | ${'serviceUnavailable'}  | ${503}
    `('$method', ({ code, method, status }) => {
      it('should accept a message', () => {
        const message = chance.sentence();
        const e = Errors[method](message);

        expect(e).toBeDefined();
        expect(e.get('status')).toBe(status);
        expect(e.get('code')).toBe(code);
        expect(e.get('message')).toBe(message);
      });

      it('should accept a code and a message', () => {
        const testCode = chance.word().toUpperCase();
        const message = chance.sentence();
        const e = Errors[method](message, testCode);

        expect(e).toBeDefined();
        expect(e.get('status')).toBe(status);
        expect(e.get('code')).toBe(testCode);
        expect(e.get('message')).toBe(message);
      });

      it('should accept an error object', () => {
        const obj = generateError();
        const e = Errors[method](obj);

        expect(e).toBeDefined();
        expect(e.get('status')).toBe(status);
        expect(e.get('code')).toBe(obj.code);
        expect(e.get('message')).toBe(obj.message);
      });

      it('should accept an error object but use a default code', () => {
        const obj = generateError();
        const objWithoutCode = { message: obj.message };
        const e = Errors[method](objWithoutCode);

        expect(e).toBeDefined();
        expect(e.get('status')).toBe(status);
        expect(e.get('code')).toBe(code);
        expect(e.get('message')).toBe(objWithoutCode.message);
      });
    });
  });
});
