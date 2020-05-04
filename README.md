# E-RRO
Example of using Jkurwa library (DSTU4145) for getting information of E-RRO

# Install
You must install libraries:

    npm install --save jkurwa gost89 encoding
    npm install --save-dev @types/node

Forder ./keyfop contains test public key and certificate.

File rand-shim.js is required by Jkurwa library.

# Run
For start example run command: 

    tsc & node rro-exampleCLI (for TypeScript)
    or
    node rro-exampleCLI (for pure NodeJS)
    
Then, you have to select tax object and tax registator (= RRO in ukraine). To select item type a number at the beginning of needed item.
After that, you can:
- check RRO state
- see information about RRO shifts on May 2020 and documents in each shift


To exit propramm type "exit"

# References

Jkurwa library: https://github.com/dstucrypt/jkurwa
