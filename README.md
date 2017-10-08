I wrote this mostly because I felt like I didn't understand all the ins and outs of Promises, particularly with respect to Promise composability with non-Promise thenables. The A+ spec lays that out pretty well.

That said, there's really no reason to use this. There are better implementations out there. To make matters worse, this one is in ES2015, which already has a built-in Promise class that has more features and is more reliable. Use that instead.
