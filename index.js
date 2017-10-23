/**
 * Default options
 */
let defaults = {
    messageTransforms: [
        (input, opts) =>
            input.replace(/\{\{(\w+)\}\}/, (m, match) => opts[match]),
    ],
    messages: {
        isRequired: "is required",
        length: "has to be at least {{length}} characters long",
        passwordComplexity:
            "has to contain at least one number or uppercase letter.",
        email: "has to be a valid email address",
        match: "has to match the password",
        isNumber: "has to be a number",
    },
};

/**
 * Sets the default options for the library
 * 
 * @param {Defaults} opts Default options
 */
function setDefaults(opts) {
    defaults.messageTransforms = opts.messageTransforms;
    defaults.messages = Object.assign({}, defaults.messages, opts.messages);
}

/**
 * Composes multiple functions from right to left.
 * 
 * @param {} funcs 
 */
function compose(...funcs) {
    if (funcs.length === 0) {
        return arg => arg;
    }

    if (funcs.length === 1) {
        return funcs[0];
    }

    return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

/**
 * Transforms messages with one or more transformer functions
 * 
 * @param {MessageTransformer} transformer - 
 *      A transformer function, or an array of transformer functions
 */
const transformMessage = transformer => (input, opts) => {
    if (Array.isArray(transformer)) return compose(...transformer)(input, opts);

    return transformer(input, opts);
};

/**
 * A curried function with the signature
 *     ( defaultMessage: string, transforms?: MessageTransformer ) => 
 *         <T>(isInvalid: (toValidate: T, validationOptions?: any) => boolean) => 
 *         (options?: any) => 
 *         ValidationFunction<T>
 * 
 * It can be used to define custom validation functions:
 * 
 * @example
 *     export const validateLength = createValidation(
 *       defaults.messages.length,
 *       defaults.messageTransforms,
 *    )(
 *        (input: string, opts: { length: number }) =>
 *           input && input.length && input.length < opts.length,
 *    );
 */
const createValidation = (
    defaultMessage,
    transforms,
) => isInvalid => options => (input, object) => {
    let message = defaultMessage;

    if (typeof options === "string") message = options;
    else if (options && options.message) message = options.message;

    if (!isInvalid(input, object, options)) return undefined;

    if (transforms) message = transformMessage(transforms)(message, options);

    return message;
};

/**
 * A curried function for defining a custom validation
 * It can be used to shortly define a new validation function
 * 
 * @example
 * 
 *     const validateForm = validate({
 *      username: v(
 *         withValidation(input => !input)(
 *             "This field is required!"
 *         )
 *      )
 *     })
 */
const withValidation = createValidation(
    "This field is invalid!",
    defaults.messageTransforms,
);

/**
 * A function which takes validation functions
 * as parameter which were previously created
 * by a call to createValidation or withValidation.
 * 
 * @example
 * 
 *    const validateForm = validate({
 *        username: v(isRequired()),
 *        password: v(
 *            isRequired(),
 *            length({
 *                length: 6,
 *            }),
 *            passwordComplexity(),
 *        ),
 *        email: v(isRequired(), email()),
 *    });
 */
const v = (...funcs) => (input, object) => {
    const messages = funcs
        .map(func => {
            if (typeof func !== "function") {
                console.error("A non-function was given to 'v'.");
                return;
            }
            return func(input, object);
        })
        .filter(result => result);

    return messages.length ? messages : undefined;
};

/**
 * Creates a function which validates all
 * declared fields given. It behaves very
 * much like ramda's `evolve` function except
 * that it does not ignore properties which are
 * not defined on the object.
 * 
 * The returned object of the validation defines
 * only the properties which were invalid. The
 * associated value is an array of failure messages 
 * (strings)
 * 
 * @example
 * 
 *    const validateForm = validate({
 *        username: v(isRequired()),
 *        password: v(
 *            isRequired(),
 *            length({
 *                length: 6,
 *            })
 *        ),
 *        email: v(isRequired(), email()),
 *    });
 * 
 *     const validated = validateForm({
 *         username: "foo",
 *         password: "",
 *         email: "anymail"
 *     });
 *     
 *     console.log(validated);
 *     // Output: {
 *     //     password: [<required failure msg>, <length failure msg>],
 *     //     email: [<mail format failure msg>]
 *     // }
 * 
 * @param {Validator<X extends T & object>} - The property validation object
 * @param {T extends { [ key: string ]: any }} - (curried) The object to validate
 * @returns {Validated<T>} - The final validation response
 */
const validate = function(transformations) {
    return object => {
        const result = {};

        for (const key in transformations) {
            const transformation = transformations[key];
            result[key] =
                typeof transformation === "function"
                    ? transformation(object && object[key], object)
                    : transformation && typeof transformation === "object"
                      ? validate(transformation, object && object[key], object)
                      : object[key];
        }

        Object.keys(result).forEach(key => {
            if (!result[key]) delete result[key];
        });

        return result;
    };
};

/**
 * Tests the result of a previous validation
 * and returns true if the validated object is
 * valid and false otherwise.
 * 
 * @example
 * 
 * const validateUser = validate({ ... });
 * const validationResult = validateUser({ name: "bob" });
 * console.log(isValid(validationResult));
 * @param {object} validationResult The result of the validation
 */
const isValid = function(validationResult) {
    return !Object.keys(validationResult).length;
};

/**
 * Defines a property as required
 */
const isRequired = createValidation(
    defaults.messages.isRequired,
    defaults.messageTransforms,
)(input => !input);

/**
 * Constraints the length of a property (string) to a specific length
 */
const length = createValidation(
    defaults.messages.length,
    defaults.messageTransforms,
)((input, object, opts) => input && input.length && input.length < opts.length);

/**
 * Constraints the password to a certain complexity
 */
const passwordComplexity = createValidation(
    defaults.messages.passwordComplexity,
    defaults.messageTransforms,
)(
    (input, object, opts) =>
        input && !(opts && opts.regex ? opts.regex : /[^a-z]/).test(input),
);

/**
 * Makes the input field to have to match the input
 * of another input field
 */
const match = createValidation(
    defaults.messages.match,
    defaults.messageTransforms,
)((input, object, opts) => input && object[opts.field] !== input);

/**
 * Constraints a string to require a proper email format
 */
const email = createValidation(
    defaults.messages.email,
    defaults.messageTransforms,
)(
    input =>
        input &&
        !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
            input,
        ),
);

/**
 * Contraints an input to be a string
 */
const isNumber = createValidation(
    defaults.messages.isNumber,
    defaults.messageTransforms,
)(input => input && (isNaN(input) || typeof input !== "number"));

// Export functions
module.exports = {
    v,
    validate,
    createValidation,
    withValidation,
    isRequired,
    length,
    passwordComplexity,
    match,
    email,
    isNumber,
    isValid,
    defaults,
};
