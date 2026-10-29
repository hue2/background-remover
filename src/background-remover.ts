type BackgroundRemoverProps = {
    input: Blob;
    hex?: string;
    tolerance?: number;
    softness?: number;
}

export default async function removeBackground(props: BackgroundRemoverProps) {
  const {
    input,
    hex = "#FFFFFF",
    tolerance = 60,
    softness = 40,
  } = props;

  if (!input) {
      throw new Error("Input file is required.");
  }

  const color = hex.replace(/^#/, "");

  if (
    !/^[0-9a-f]{6}$/i.test(color) ||
    !Number.isFinite(tolerance) || tolerance < 0 ||
    !Number.isFinite(softness) || softness < 0
  ) {
    throw new Error("Please use a valid hex color code and non-negative numbers for tolerance and softness.");
  }

  const background = [
    parseInt(color.slice(0, 2), 16),
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16),
  ];

  const bitmap = await createImageBitmap(input);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create a 2D canvas context.");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
  //calculate the Euclidean distance between the user's targeted background color vs the current's image color
    const distance = Math.hypot(
      //red
      data[i] - background[0],
      //green
      data[i + 1] - background[1],
      //blue
      data[i + 2] - background[2]
    );

    //check how transparent the current image is
    const opacity = softness === 0
      ? Number(distance > tolerance)
      : Math.max(0, Math.min(1, (distance - tolerance) / softness));

    //data[i] = red, data[i + 1] = green, data[i + 2] = blue, data[i + 3] = transparency (alpha channel)
    //if the opacity for the current pixel is 0, set all channels to 0 (fully transparent) and continue to the next pixel
    if (opacity === 0) {
      //red       //green     //blue         //alpha/transparency
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }

    if (opacity < 1) {
      //unblend the leftover pixels, usually around the edges resulting in a glow.
      for (let c = 0; c < 3; c++) {
        //formula comes from a technique called Alpha Compositing
        const foreground =
          (data[i + c] - background[c] * (1 - opacity)) / opacity;

        data[i + c] = Math.round(
          Math.max(0, Math.min(255, foreground))
        );
      }
    }

    data[i + 3] = Math.round(data[i + 3] * opacity);
  }

  context.putImageData(imageData, 0, 0);

  //PNG keeps the alpha channel; JPEG would flatten the transparency
  return canvas.toDataURL("image/png");
}
