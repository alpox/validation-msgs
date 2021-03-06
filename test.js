let {
  validate,
  v,
  length,
  isRequired,
  isNumber,
  passwordComplexity,
  withValidation,
  createValidation,
  isValid,
  setDefaults,
  transformValidator
} = require("./index");

describe("validate", () => {
  it("returns a validation function", () => {
    const valid = validate({
      username: v(
        length({
          length: 6
        })
      )
    });

    expect(valid).toEqual(expect.any(Function));
  });

  it("returns an empty object for a valid object", () => {
    const valid = validate({
      username: v(
        length({
          length: 6
        })
      )
    });

    const validated = valid({ username: "bethesda" });

    expect(Object.keys(validated).length).toBe(0);
  });

  it("returns an object with a validation error if there was a validation error.", () => {
    const valid = validate({
      username: v(
        length({
          length: 6
        })
      )
    });

    const validated = valid({ username: "bob" });

    expect(validated.username).toEqual(expect.any(Array));
    expect(validated.username.length).toBe(1);
    expect(validated.username[0]).toBe("has to be at least 6 characters long");
  });

  it("can validate multiple properties correctly", () => {
    const valid = validate({
      username: v(
        length({
          length: 4
        })
      ),
      password: v(
        length({
          length: 6
        })
      ),
      city: v(length({ length: 3 })),
      age: v(isNumber())
    });

    const validated = valid({
      username: "bob",
      age: "6",
      password: "test",
      city: "Bern"
    });

    expect(validated.username.length).toBe(1);
    expect(validated.password.length).toBe(1);
    expect(validated.age.length).toBe(1);
    expect(validated.city).toBeUndefined();
  });

  it("can validate multiple constraints correctly", () => {
    const valid = validate({
      password: v(
        isRequired(),
        length({
          length: 5
        }),
        passwordComplexity()
      )
    });

    const validated = valid({
      password: "test"
    });

    expect(validated.password.length).toBe(2);
  });

  it("can create custom one-time messages", () => {
    const valid = validate({
      password: v(isRequired("this darn field is needed!"))
    });

    const valid2 = validate({
      password: v(
        length({
          length: 5,
          message: "has to be looong!"
        })
      )
    });

    const validated = valid({});
    const validated2 = valid2({ password: "foo" });

    expect(validated.password[0]).toBe("this darn field is needed!");
    expect(validated2.password[0]).toBe("has to be looong!");
  });
});

describe("isvalid", () => {
  it("returns true if the validated object is valid", () => {
    const valid = validate({
      username: v(
        length({
          length: 6
        })
      )
    });

    const validated = valid({ username: "bethesda" });

    expect(isValid(validated)).toBe(true);
  });

  it("returns false if the validated object is not valid", () => {
    const valid = validate({
      username: v(
        length({
          length: 6
        })
      )
    });

    const validated = valid({ username: "bob" });

    expect(isValid(validated)).toBe(false);
  });
});

describe("new validations", () => {
  it("can be created", () => {
    const isNum = createValidation("has to be a num")(
      input => input && (isNaN(input) || typeof input !== "number")
    );

    const valid = validate({
      age: v(isNum())
    });

    const validated = valid({ age: "6" });
    const validated2 = valid({ age: 6 });

    expect(isValid(validated)).toBe(false);
    expect(validated.age[0]).toBe("has to be a num");
    expect(isValid(validated2)).toBe(true);
    expect(validated2.age).toBeUndefined();
  });
});

describe("withValidation", () => {
  it("can be used for the inline-creation of a validation", () => {
    const valid = validate({
      age: v(withValidation(input => !input)("This field is required!"))
    });

    const validated = valid({});
    const validated2 = valid({ age: 2 });

    expect(isValid(validated)).toBe(false);
    expect(validated.age[0]).toBe("This field is required!");
    expect(isValid(validated2)).toBe(true);
    expect(validated2.age).toBeUndefined();
  });
});

describe("setDefaults", () => {
  it("properly sets future default messages", () => {
    setDefaults({
      messages: {
        isRequired: "i require you to show up!"
      }
    });

    const valid = validate({
      username: v(isRequired()),
      password: v(length({ length: 5 }))
    });

    const validated = valid({ password: "hio" });

    expect(validated.username[0]).toBe("i require you to show up!");
    expect(validated.password[0]).toBe("has to be at least 5 characters long");
  });

  it("properly sets message transforms", () => {
    setDefaults({
      messageTransforms: [(input, opts) => "Gotcha"]
    });

    const valid = validate({
      username: v(isRequired())
    });

    const validated = valid({});

    expect(validated.username[0]).toBe("Gotcha");
  });
});

describe("transformValidator", () => {
  it("transforms a validator function properly to a validation-msgs validator", () => {
    setDefaults({
      messageTransforms: [input => input],
      messages: {
        isLength: "needs the isLength!"
      }
    });

    const isLength = (str, options) => {
      if (!options) return true;
      const minCond =
        (options.min && str.length >= options.min) || !options.min;
      const maxCond =
        (options.max && str.length <= options.max) || !options.max;
      return minCond && maxCond;
    };

    const toValidate = {
      username: "a"
    };

    const lengthValidator = transformValidator("isLength", isLength);
    const valid = validate({
      username: v(lengthValidator({ min: 4 }))
    });

    const validated = valid(toValidate);

    expect(isValid(validated)).toBeFalsy();
    expect(validated.username).toEqual(["needs the isLength!"]);
  });

  it("transforms validator functions with string parameters", () => {
    setDefaults({
      messages: {
        isHash: "needs the isHash!"
      }
    });

    const isHash = (str, algo) => {
      console.log(str, algo);
      expect(algo).toEqual(expect.any(String));
      return false;
    };

    const isHashValidator = transformValidator("isHash", isHash);

    const valid = validate({
      username: v(isHashValidator({ nativeParams: ["algo"] }))
    });

    const validated = valid({
      username: "test"
    });

    expect(validated.username).toEqual(["needs the isHash!"]);
  });
});
