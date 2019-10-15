const VALUE = Symbol('value')
//console.log('eval: ' + (eval(VALUE)).toString())

class Secret {
  constructor(val) {
    this[VALUE] = val
    //this.VALUE = val
  }
  
  get() { return this[VALUE] }
}

// ...

let mySecret = new Secret('password')

console.log(mySecret['VALUE'])                     				// undefined
console.log('local: ' + mySecret[Symbol('value')])             // undefined
console.log('global: ' + mySecret[Symbol.for('value')])         // undefined
console.log(Object.getOwnPropertyNames(mySecret))  				// []
console.log(mySecret.get())                        				// "password"

//https://medium.com/@obaranovskyi/js-symbol-and-well-known-symbols-c3c9cc395b6d