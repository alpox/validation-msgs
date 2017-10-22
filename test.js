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
    defaults,
} = require("./index");

describe("validate", () => {
    it("returns a validation function", () => {
        const valid = validate({
            username: v(
                length({
                    length: 6,
                }),
            ),
        });

        expect(valid).toEqual(expect.any(Function));
    });

    it("returns an empty object for a valid object", () => {
        const valid = validate({
            username: v(
                length({
                    length: 6,
                }),
            ),
        });

        const validated = valid({ username: "bethesda" });

        expect(Object.keys(validated).length).toBe(0);
    });

    it("returns an object with a validation error if there was a validation error.", () => {
        const valid = validate({
            username: v(
                length({
                    length: 6,
                }),
            ),
        });

        const validated = valid({ username: "bob" });

        expect(validated.username).toEqual(expect.any(Array));
        expect(validated.username.length).toBe(1);
        expect(validated.username[0]).toBe(
            "has to be at least 6 characters long",
        );
    });

    it("can validate multiple properties correctly", () => {
        const valid = validate({
            username: v(
                length({
                    length: 4,
                }),
            ),
            password: v(
                length({
                    length: 6,
                }),
            ),
            city: v(length({ length: 3 })),
            age: v(isNumber()),
        });

        const validated = valid({
            username: "bob",
            age: "6",
            password: "test",
            city: "Bern",
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
                    length: 5,
                }),
                passwordComplexity(),
            ),
        });

        const validated = valid({
            password: "test",
        });

        expect(validated.password.length).toBe(2);
    });

    it("can create custom one-time messages", () => {
        const valid = validate({
            password: v(isRequired("this darn field is needed!")),
        });

        const valid2 = validate({
            password: v(
                length({
                    length: 5,
                    message: "has to be looong!",
                }),
            ),
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
                    length: 6,
                }),
            ),
        });

        const validated = valid({ username: "bethesda" });

        expect(isValid(validated)).toBe(true);
    });

    it("returns false if the validated object is not valid", () => {
        const valid = validate({
            username: v(
                length({
                    length: 6,
                }),
            ),
        });

        const validated = valid({ username: "bob" });

        expect(isValid(validated)).toBe(false);
    });
});

describe("new validations", () => {
    it("can be created", () => {
        const isNum = createValidation(
            "has to be a num",
            defaults.messageTransforms,
        )(input => input && (isNaN(input) || typeof input !== "number"));

        const valid = validate({
            age: v(isNum()),
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
            age: v(withValidation(input => !input)("This field is required!")),
        });

        const validated = valid({});
        const validated2 = valid({ age: 2 });

        expect(isValid(validated)).toBe(false);
        expect(validated.age[0]).toBe("This field is required!");
        expect(isValid(validated2)).toBe(true);
        expect(validated2.age).toBeUndefined();
    });
});
