import * as tf from '@tensorflow/tfjs';
import {
  MnistData
} from "../../src/scripts/data.js";

const model = tf.sequential();

//1st layer: 2d convolutional
model.add(
  tf.layers.conv2d({
    inputShape: [28, 28, 1], //28x28 image with 1 colour channel
    kernelSize: 5, //5x5 filter window
    filters: 8, //number of filter windows of kernalSize
    strides: 1, //step size of sliding window
    activation: "relu", //rectified linear unit
    kernelInitializer: "VarianceScaling", //random initallizing weights
    name: "conv1"
  }),
);

//2nd layer: max pooling layer
//downsamples the result from the 1st layer
model.add(
  tf.layers.maxPooling2d({
    poolSize: [2, 2], //2x2 pooling window
    strides: [2, 2], //moves 2 pixels horizontal and 2 pixels vertical
    name: "pool1"
  })
);

//3rd layer: second convolutinal layer
model.add(
  tf.layers.conv2d({
    //note input shape inferred from previous layer
    kernelSize: 5,
    filters: 16, //double the amount of filters
    strides: 1,
    activation: "relu",
    kernelInitializer: "VarianceScaling",
    name: "conv2"
  })
);

//4th layer: second pooling layer
model.add(
  tf.layers.maxPooling2d({
    poolSize: [2, 2],
    strides: [2, 2],
    name: "pool2"
  })
);

//5th layer: flattens output from previous layer to tensor1d
model.add(tf.layers.flatten());

//6th layer: dense output layer
model.add(
  tf.layers.dense({
    units: 10, //10 outpu nodes for 0-9
    kernelInitializer: "VarianceScaling",
    activation: "softmax", //normalizes vector into probability distrobution
    name: "output"
  })
);

//training the model

const LEARNING_RATE = 0.15
const optimizer = tf.train.sgd(LEARNING_RATE); //stochastic gradient descent optimizer

model.compile({
  optimizer: optimizer,
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy']
})

//const BATCH_SIZE = 64;
//const TRAIN_BATCHES = 100;

const TEST_BATCH_SIZE = 1000;
const TEST_ITERATION_FREQUENCY = 5;


export async function train(data, BATCH_SIZE, TRAIN_BATCHES) {

  // We'll keep a buffer of loss and accuracy values over time.
  const lossValues = [];
  const accuracyValues = [];

  // Iteratively train our model on mini-batches of data.
  for (let i = 0; i < TRAIN_BATCHES; i++) {
    const [batch, validationData] = tf.tidy(() => {
      const batch = data.nextTrainBatch(BATCH_SIZE);
      batch.xs = batch.xs.reshape([BATCH_SIZE, 28, 28, 1]);

      let validationData;
      // Every few batches test the accuracy of the model.
      if (i % TEST_ITERATION_FREQUENCY === 0) {
        const testBatch = data.nextTestBatch(TEST_BATCH_SIZE);
        validationData = [
          // Reshape the training data from [64, 28x28] to [64, 28, 28, 1] so
          // that we can feed it to our convolutional neural net.
          testBatch.xs.reshape([TEST_BATCH_SIZE, 28, 28, 1]), testBatch.labels
        ];
      }
      return [batch, validationData];
    });

    // The entire dataset doesn't fit into memory so we call train repeatedly
    // with batches using the fit() method.
    const history = await model.fit(
      batch.xs, batch.labels, {
        batchSize: BATCH_SIZE,
        validationData,
        epochs: 1
      });

    const loss = history.history.loss[0];
    const accuracy = history.history.acc[0];

    console.log("Loss: " + loss + ", Accuracy: " + accuracy)

    // Plot loss / accuracy.
    lossValues.push({
      'batch': i,
      'loss': loss,
      'set': 'train'
    });

    if (validationData != null) {
      accuracyValues.push({
        'batch': i,
        'accuracy': accuracy,
        'set': 'train'
      });
    }

    // Call dispose on the training/test tensors to free their GPU memory.
    tf.dispose([batch, validationData]);

    // tf.nextFrame() returns a promise that resolves at the next call to
    // requestAnimationFrame(). By awaiting this promise we keep our model
    // training from blocking the main UI thread and freezing the browser.
    await tf.nextFrame();
  }

  let layers = [model.getLayer("conv1"),model.getLayer("pool1"),model.getLayer("conv2"),model.getLayer("pool2"),model.getLayer("output")]
  // console.log("Loss Values: " + lossValues + " Accuracy Values: " + accuracyValues)
  return [lossValues, accuracyValues, layers]
}


// **WIP**
export function predict(data) {
  //convert data to tensor
  var dataTensor = tf.tensor(data)
  dataTensor = dataTensor.reshape([1, 28, 28, 1])

  //make prediction
  var prediction = model.predict(dataTensor)

  //return prediction
  return (prediction.dataSync())
}
