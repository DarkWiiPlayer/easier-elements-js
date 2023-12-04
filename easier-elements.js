export default Class => {
	const proto = Class.prototype

	const attributes = Class.attributes || {}

	const props = []

	/* Adds getters and setters for attributes and registers them as observed */
	Object.entries(attributes).forEach(([name, attribute]) => {
		if (attribute === true) attribute = { get: true, set: true }
		else if (attribute === false) attribute = { get: true, set: false }

		const htmlName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
		props.push(htmlName)
		const prop = {}

		prop.get = typeof attribute.get == "function"
			? function() { return attribute.get.call(this, this.getAttribute(htmlName)) }
			: function() { return this.getAttribute(htmlName) }

		prop.set = typeof attribute.set == "function"
			? function(val) { return this.setAttribute(htmlName, attribute.set.call(this, val)) }
			: attribute.set === false
			? function() { throw(Error(`Attribute ${name} cannot be set`)) }
			: function(val) { this.setAttribute(htmlName, val) }

		Object.defineProperty(proto, name, prop)
	})
	Object.freeze(props)

	Object.defineProperty(Class.prototype, "props", { get() { return Object.fromEntries(props.map(prop => [prop, this[prop]])) } })

	const observedAttributes = Object.freeze([...Object.keys(attributes)])

	Object.defineProperty(Class, "observedAttributes", {
		get() { return observedAttributes }
	})

	/* Handles attribute changes in a more convenient way */
	const attributeChangedCallback = Class.prototype.attributeChangedCallback
	Class.prototype.attributeChangedCallback = function(name, oldValue, newValue) {
		if (attributeChangedCallback)
			attributeChangedCallback.call(this, name, oldValue, newValue)

		name = name.replaceAll(/-(.)/g, (_, b) => b.toUpperCase())
		const get_transform = attributes[name]?.get
		if (`${name}Changed` in this) {
			if (typeof get_transform == "function")
				return this[`${name}Changed`](get_transform(oldValue), get_transform(newValue))
			else
				return this[`${name}Changed`](oldValue, newValue)
		}

		if (`changed` in this) {
			if (typeof get_transform == "function")
				return this.changed(name, get_transform(oldValue), get_transform(newValue))
			else
				return this.changed(name, oldValue, newValue)
		}
	}

	/*
		Batch methods, defined by prefixing the method with a dollar sign,
		will generate a wrapper method of the same name without the dollar
		which queues up the actual method to run in a microtask.

		The arguments passed to the wrapper will be collected into an array,
		and the scheduled method will be called with an array containing
		all these argument lists in the same order as the corresponding method
		calls.
	*/
	for (const name of Object.getOwnPropertyNames(Class.prototype)) {
		if (name.startsWith("$")) {
			const prop = Object.getOwnPropertyDescriptor(Class.prototype, name)
			if (typeof prop.value == "function") {
				Class.queues = new WeakMap()
				Class.prototype[name.slice(1)] = function(...args) {
					const queue = Class.queues.has(this) ? Class.queues.get(this) : []
					if (!queue.length) queueMicrotask(() => {
						this[name](queue, ...queue[queue.length-1])
						queue.length = 0
					})
					queue.push(args)
					Class.queues.set(this, queue)
				}
			}
		}
	}

	/*
	   Handles conversion to primitives.
	   Tis is mostly interesting when a custo element has some
		numeric representation, like a counter.
	*/
	Object.prototype[Symbol.toPrimitive] = function(hint) {
		const name = `to${hint.replace(/./, e => e.toUpperCase())}`
		return name in this
			? this[name]()
			: "toDefault" in this
			? this.toDefault()
			: `[object ${Class.name}]`
	}

	/*
	   Shortcut to insert global styles for this component.
		Note that it is up to the user to make sure these styles only
		apply to the component in question.
	*/
	if (Class.css) {
		const tag = document.createElement("style")
		tag.innerHTML = String(Class.css)
	}

	name = Class.name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
	customElements.define(name, Class, {extends: Class.is})
}
