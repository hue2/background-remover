import sharp from "sharp";

type BackgroundRemoverProps = {
    input: string;
    hex?: string;
    tolerance?: number;
    softness?: number;
}

export default async function RemoveBackground(props: BackgroundRemoverProps) {
  const {
    input,
    hex = "#FFFFFF",
    tolerance = 200,
    softness = 50,
  } = props;

  if (!input) {
      throw new Error("Input file path is required.");
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

  const { data } = await sharp(input)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });


  for (let i = 0; i < data.length; i += 4) {
  //calculate the Euclidean distance between the user's targeted background color vs the current's image color
    const distance = Math.hypot(
      data[i] - background[0],
      data[i + 1] - background[1],
      data[i + 2] - background[2]
    );

    //check how transparent the current image is
    const opacity = softness === 0
      ? Number(distance > tolerance)
      : Math.max(0, Math.min(1, (distance - tolerance) / softness));

    //data[i] = red, data[i + 1] = green, data[i + 2] = blue, data[i + 3] = transparency (alpha channel)
    //if the opacity for the current pixel is 0, set all channels to 0 (fully transparent) and continue to the next pixel
    if (opacity === 0) {
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

  const imageBase64 = `data:image/jpeg;base64,${data.toString('base64')}`;
  return imageBase64; 
}