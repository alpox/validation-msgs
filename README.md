# validation-msgs

This is a validation library with a functional style with the goal to make the
validation with multiple validation messages in conjunction with their
respective property easy.

Features:

* Validate multiple properties at once
* Multiple validation messages organized with their respective property
* No dependencies
* Customizable validation messages
* Message transformer for internationalization etc.
* Functional Definition of constraints
* Inline declaration of new rules
* Can transform simple validation functions like from
  [validator](https://www.npmjs.com/package/validator) to validation-msgs
  compatible versions

## Usage

```
const validateForm = validate({
    username: v(isRequired()),
    password: v(
        isRequired(),
        length({
            length: 6,
        })
    ),
    passwordRepeat: v(
        isRequired(),
        match({
            field: "password",
            message: "does not match the password",
        }),
    ),
    email: v(isRequired(), email()),
});

const validationResult = validateForm({
    password: "someVeryGoodPassword!",
    passwordRepeat: "someVeryGoodOups!",
    email: "ebernhaut@itbernhaut.ch"
});

console.log(validationResult);
/**
* Logs:
* {
*   username: ["is required"],
*   passwordRepeat: ["does not match the password"]
* }
*/

console.log(isValid(validationResult));
// Logs: false
```

## Defaults

Be aware that messageTransforms can be used easily for internationalization
transformations.

```
let defaults = {
    messageTransforms: [
        (input, opts) =>
            input.replace(/\{\{(\w+)\}\}/, (m, match) =>
                opts[match]),
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
```

## setDefaults(defaults)

Accepts a default object as shown above and merges them with the initial
defaults.

# Validation

## createValidation(defaultMsg: string | (defaults) => defaults.message.\<message_name>, messageTransformFunctions?: Array

<Function>)(invalidFunc: Function)

> Returns a validation rule

The default way to create new validation rules - also used internally to create
the rules. Use this if you want to create standard rules for the use everywhere
in your application.

The defaultMsg is usually a selector function which takes as first and only
argument the defaults object. Use this to select one of the default messages in
the default object.

Optionally you can pass a specific message transform function or an array of
message transform functions which should be used instead of the default message
transforms.

```
/**
 * Constraints the length of a property (string) to a specific length
 */
const length = createValidation(
    (defaults) => defaults.messages.length,
)((input, object, opts) =>
    input && input.length && input.length < opts.length);
```

## withValidation(invalidFunc: Function)(message: string)

> Returns a validation rule

A carried function for an easy creation of new rules. It can be used for rules
used only at one place as well as for the usage at multiple places.

```
const valid = validate({
    age: v(
        withValidation
            (input => !input)
            ("This field is required!")
    ),
});
```

## validate(rules: object)

> Returns a function for the validation of objects

The main function for the creation of a form or model validation.

```
const validateForm = validate({
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

const validated = validateForm({
    username: "bob",
    age: "6",
    password: "test",
    city: "Bern",
});
```

## v(...validationRules)

> Returns a function which is composed of all validationRules.

This function composes an arbitrary number of validationRules. It returns a
function with the signature:

> function(input: any, object: object)

where the `input` refers to the value to validate and the object refers to the
object which is the origin of the input through some property.

This is used internally to validate an input but can also be used out of
context.

```
validateProperty = v(
        length({
            length: 15
        }),
        email()
    );

const user = {
    email: "someweirdmail"
}

const validation = validateProperty(user.email, user);

console.log(validation);
/**
* Logs:
* ["has to be at least 15 characters long",
*  "has to be a valid email address"]
```

## isValid(validationResult: object)

> Returns true if the validated object is valid. False otherwise.

The standard output of a validation in validation-msgs is an object with
properties and respective validation messages. Therefore we need a possibility
to get a boolean which only tells us if the object was valid or not. The
function isValid does this job and operates on the standard validation result.

```
const validated = validateForm({
    username: "bob",
    age: "6",
    password: "test",
    city: "Bern",
});

console.log(isValid(validated));
```

# Predefined rules

There are more to come and i'll gladly take suggestions. Until now there are not
many available, but its easy to create your own.

All options with a questionmark are optional. If every property in the options
are optional, you don't have to pass any option.

* isRequired({ message?: string })
* length({ length: number, message?: string })
* passwordComplexity({ regex?: regex, message?: string })
* match({ field: string, message?: string })
* email({ message?: string })

# Transform simple validation functions

You can use your own simple validation functions and transform them into a
validation-msgs compatible format.

This includes all validation functions from
[validator](https://www.npmjs.com/package/validator).

## transformValidator(name, validatorFunc)

> Returns the validation-msgs compatible format of the validatorFunc

If the simple validation function which you pass to `transformValidator` expects
anything else than an option object, you have to use `{ nativeParams:
[<parameters>] }` in the options which can be passed to the validation-msgs
compatible validation function.

This is because in `isHash("sha256")`, validation-msgs would take the `sha256`
as a replacement for the default error message.

```
import { isHash as isHashValidator } from "validator";
import { transformValidator } from "validation-msgs";

const isHash = transformValidator("isHash", isHashValidator);

const validateForm = validate({
    password: v(
        isHash({ nativeParams: "sha256" })
    )
})
```
