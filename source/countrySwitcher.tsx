// src/index.js
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import base64UrlDownloader from './downloader.js';


export default function CountrySwitcher(){
	  const [input, setInput] = useState('');

  const handleSubmit = async (value: string) => {
    try {
      
      const { data: utf8 } = await base64UrlDownloader(value);
      
      process.exit(0);
    } catch (err: any) {
      console.error('Ошибка при загрузке:', err.message);
      process.exit(1);
    }
  };

  return (
    <Box flexDirection="column">
      <Text>Введите URL конфига:</Text>
      <TextInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};



