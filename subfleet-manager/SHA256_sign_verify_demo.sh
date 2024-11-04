#integration, dummy DLT for public key, file+sig + public key from DLT: verification 
#generate key pair

openssl ecparam -genkey -name secp384r1 > private_key.pem

#show private key
openssl pkcs8 -topk8 -in private_key.pem -nocrypt

#public key, show
openssl ec -in private_key.pem -pubout > public_key.pem
cat public_key.pem

#sign, private key
openssl dgst -sha256 -sign private_key.pem TestAgent.txt > testkeypair.sig

#verify, public key
openssl dgst -sha256 -verify public_key.pem -signature testkeypair.sig TestAgent.txt 
#Verified OK

#COSIGN 
#cosign generate-key-pair
#cosign sign --key cosign.key user/demo
#cosign sign --key cosign.key TestAgent.txt
#cosign sign --key=cosign.key $COSIGN_BLOG_IMAGE/$COSIGN_BLOG_TAG
#cosign triangulate ${{COSIGN_BLOG_IMAGE}}/${{COSIGN_BLOG_TAG}}
#cosign verify --key=cosign.pub $COSIGN_BLOG_IMAGE:$COSIGN_BLOG_TAG

# submit signature for & signing cert to REKOR
# print inclusion proof
# delete private key 

