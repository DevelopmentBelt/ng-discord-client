import { Pipe, PipeTransform } from '@angular/core';
import {Moment} from "moment";

@Pipe({
  name: 'datetimeFormatter',
  standalone: true
})
export class DatetimeFormatterPipe implements PipeTransform {

  transform(value: Moment, format: string): string {
    return value.format(format);
  }

}
