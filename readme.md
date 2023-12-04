# Easier Elements

```js
import element from 'easier-elements.js'
```

A helper library to make custom elements much more convenient without wrapping
them up in a whole framework.

Main features:

* More declarative handling of attributes
* Delayed methods that run in a microtask
* Automatic registration based on class name

## Attributes

Attributes are defined by setting the static `attributes` field to an object.
Every key will be registered as an observed attribute and will generate a pair
of setter and getter according to the corresponding value.

### Getters and Setters

For boolean values, `true` creates simple getters and setters that only forward
the value, while `false` will generate the getter, but no setter.

For values that are objects, the `get` and `set` methods can be set to `true`
(as above), `false` (to skip) or to a filter function, which converts the
attribute between a string in the HTML attribute and a more structured value.

```js
element(class FooBar extends HTMLElement {
   static attributes = {
      name: false,
      age: true,
      data: {
         get: JSON.parse,
         set: JSON.stringify
      }
   }
})
```

### Observed Attributes

All the values in `attributes` will automatically be collected into an
`observedAttributes` list so the browser will notify the component when they
change.

The helper also redefines the `attributeChangedCallback` method of the class to perform
the following steps:

1. Call the original `attributeChangedCallback` method, if one was defined, with the
   unmodified input.
2. Attempt to call a `<attr>Changed` method, where `<attr>` is the name of the
   attribute, passing in the old and new value **after** applying the get filter
   function defined in `attributes` (if there is one)
3. Attempt to call the `changed` method, passing the attribute name and the
   (filtered) old and new values.

```js
element(class FooBar extends HTMLElement {
   static attributes = {
      age: true
   }

   ageChanged(_, to) {
      console.log(`Age has changed to ${to}`)
   }
})
```

## Batch Methods

Methods starting with a dollar sign will generate a corresponding batched method
of the same name without the dollar sign. When this method is called, it will
collect all the arguments into an array and schedule the original dollar method
to run in a microtask (unless it is already scheduled).

The original method will then be called only once, and passed:

* As its first argument, an array of arrays containing the arguments to the
  batched method for every time it was called, in chronological order.
* The spread arguments from the last (most recent) call of the batched method.

This API aims to find a balance between cases where only the last call of a
method should "take effect", and those where every call needs to have a distinct
effect.

The primary purpose of this is to prevent repeated re-rendering of the element
when its state changes, but it can also be used for batched state updates
elsewhere in the system, like a different component or even an external API.

```js
element(class FooBar extends HTMLElement {
   static attributes = {
      age: true
   }

   $ageChanged([[from]], _, to) {
      console.log(`Age has changed from ${from} to ${to}`)
   }
})
```

### Primitives

TODO: Document (see code)

### Global CSS

TODO: Document (see code)

(may change)
