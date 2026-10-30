import './App.css';
import React, { useState } from 'react';
import removeBackground from './background-remover';

function App() {
 const [uploadedImage, setUploadedImage] = useState<File>();
 const [previewUrl, setPreviewUrl] = useState<string>();
 const [result, setResult] = useState<string>();

 const onBackgroundRemoval = async () => {
  const imageResult = await removeBackground({ input: uploadedImage });
  setResult(imageResult);
 }

 const onImageUpload = (file?: File) => {
  if (!file) return;
  setUploadedImage(file);
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
 }
  return (
    <>
      <div className='page'>
        <div className="title">
          <h3>Image Background Remover</h3>
        </div>
        <div className="content">
          <input type='file' accept='image' onChange={(event) => onImageUpload(event.target.files?.[0])} />
          <img src={previewUrl} />
          <button onClick={onBackgroundRemoval}>Remove background</button>
          <img src={result} />
        </div>
      </div>
    </>
  )
}

export default App
