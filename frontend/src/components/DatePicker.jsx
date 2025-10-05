import React, { HTMLAttributes } from 'react';
import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

const MapDatePicker = ({
  selectedDate,
  onChange,
  isClearable = false,
  showPopperArrow = false,
  ...props
}) => {
  return (
    <DatePicker selected={selectedDate} onChange={(date) => onChange(date)} />
  );
};

export default MapDatePicker;