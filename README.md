# pointcloud-loader
[under construction]

Just starting with a file loader for tab separated location data text files: parsing each column to a Float32 array, find the minimum, maximum, and mean value. Then create a strided array that can be used for texture data that contains vertex data for a GPU computable point cloud. The heavy lifting for the parser happens async in a Web Worker, and the strided array come in chunks of an adjustable length. Currently, the visualization is setup to to store an initial unit box of 128 x 128 x 128 points in a two-megapixel texture. There's even a shader program to update the positions on every animation frame, which just doesn't do anything to them.

Currently I'm trying to come up with an idea how to sample from multiple buffers. The challenge is to render say 16 million points...
