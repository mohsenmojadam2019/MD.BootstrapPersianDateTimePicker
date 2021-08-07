﻿﻿import { Popover } from "bootstrap";

export class MdsPersianDateTimePicker {
  constructor(element: Element, setting: MdsPersianDateTimePickerSetting) {
    setting = this.extend(new MdsPersianDateTimePickerSetting(), setting);
    if (!element) throw new Error(`MdsPersianDateTimePicker => element is null!`);
    if (setting.toDate && setting.fromDate) throw new Error(`MdsPersianDateTimePicker => You can not set true 'toDate' and 'fromDate' together`);
    if (!setting.groupId && (setting.toDate || setting.fromDate)) throw new Error(`MdsPersianDateTimePicker => When you set 'toDate' or 'fromDate' true, you have to set 'groupId'`);

    if (setting.enableTimePicker && !setting.textFormat) setting.textFormat = 'yyyy/MM/dd   HH:mm:ss';
    else if (!setting.enableTimePicker && !setting.textFormat) setting.textFormat = 'yyyy/MM/dd';
    if (setting.enableTimePicker && !setting.dateFormat) setting.dateFormat = 'yyyy/MM/dd   HH:mm:ss';
    else if (!setting.enableTimePicker && !setting.dateFormat) setting.dateFormat = 'yyyy/MM/dd';

    this.setting = setting;
    this.setting.selectedDate = setting.selectedDate ? this.getClonedDate(setting.selectedDate) : new Date();
    this.setting.selectedDateToShow = setting.selectedDateToShow ? this.getClonedDate(setting.selectedDateToShow) : this.getClonedDate(setting.selectedDate);

    const newGuid = this.newGuid();
    this.element = element;
    this.element.setAttribute("mds-date-picker-guid", newGuid);
    MdsPersianDateTimePickerData.set(newGuid, this);

    this.bsPopover = new Popover(this.element, {
      container: 'body',
      content: this.getDateTimePickerHtml(),
      html: true,
      placement: setting.placement,
      title: this.getPopoverHeaderHtml(this.setting),
      trigger: 'manual',
      template: this.popoverHtmlTemplate,
      sanitize: false,
    });

    this.enableEvents();
  }

  // #region jalali calendar

  private toJalali(gy: number, gm: number, gd: number) {
    return this.d2j(this.g2d(gy, gm, gd));
  }

  private toGregorian(jy: number, jm: number, jd: number) {
    return this.d2g(this.j2d(jy, jm, jd));
  }

  private isValidJalaliDate(jy: number, jm: number, jd: number) {
    return jy >= -61 && jy <= 3177 &&
      jm >= 1 && jm <= 12 &&
      jd >= 1 && jd <= this.jalaliMonthLength(jy, jm);
  }

  private isLeapJalaliYear(jy: number) {
    return this.jalCal(jy).leap === 0;
  }

  private jalaliMonthLength(jy: number, jm: number) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    if (this.isLeapJalaliYear(jy)) return 30;
    return 29;
  }

  private jalCal(jy: number) {
    // Jalali years starting the 33-year rule.
    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178],
      bl = breaks.length,
      gy = jy + 621,
      leapJ = -14,
      jp = breaks[0],
      jm,
      jump = 1,
      leap,
      n,
      i;

    if (jy < jp || jy >= breaks[bl - 1])
      throw new Error('Invalid Jalali year ' + jy);

    // Find the limiting years for the Jalali year jy.
    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm)
        break;
      leapJ = leapJ + this.div(jump, 33) * 8 + this.div(this.mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;

    // Find the number of leap years from AD 621 to the beginning
    // of the current Jalali year in the Persian calendar.
    leapJ = leapJ + this.div(n, 33) * 8 + this.div(this.mod(n, 33) + 3, 4);
    if (this.mod(jump, 33) === 4 && jump - n === 4)
      leapJ += 1;

    // And the same in the Gregorian calendar (until the year gy).
    var leapG = this.div(gy, 4) - this.div((this.div(gy, 100) + 1) * 3, 4) - 150;

    // Determine the Gregorian date of Farvardin the 1st.
    var march = 20 + leapJ - leapG;

    // Find how many years have passed since the last leap year.
    if (jump - n < 6)
      n = n - jump + this.div(jump + 4, 33) * 33;
    leap = this.mod(this.mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return {
      leap: leap,
      gy: gy,
      march: march
    };
  }

  private j2d(jy: number, jm: number, jd: number) {
    var r = this.jalCal(jy);
    return this.g2d(r.gy, 3, r.march) + (jm - 1) * 31 - this.div(jm, 7) * (jm - 7) + jd - 1;
  }

  private d2j(jdn: number) {
    var gy = this.d2g(jdn).gy, // Calculate Gregorian year (gy).
      jy = gy - 621,
      r = this.jalCal(jy),
      jdn1F = this.g2d(gy, 3, r.march),
      jd,
      jm,
      k;

    // Find number of days that passed since 1 Farvardin.
    k = jdn - jdn1F;
    if (k >= 0) {
      if (k <= 185) {
        // The first 6 months.
        jm = 1 + this.div(k, 31);
        jd = this.mod(k, 31) + 1;
        return {
          jy: jy,
          jm: jm,
          jd: jd
        };
      } else {
        // The remaining months.
        k -= 186;
      }
    } else {
      // Previous Jalali year.
      jy -= 1;
      k += 179;
      if (r.leap === 1)
        k += 1;
    }
    jm = 7 + this.div(k, 30);
    jd = this.mod(k, 30) + 1;
    return {
      jy: jy,
      jm: jm,
      jd: jd
    };
  }

  private g2d(gy: number, gm: number, gd: number) {
    var d = this.div((gy + this.div(gm - 8, 6) + 100100) * 1461, 4) +
      this.div(153 * this.mod(gm + 9, 12) + 2, 5) +
      gd - 34840408;
    d = d - this.div(this.div(gy + 100100 + this.div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  private d2g(jdn: number) {
    var j;
    j = 4 * jdn + 139361631;
    j = j + this.div(this.div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = this.div(this.mod(j, 1461), 4) * 5 + 308;
    var gd = this.div(this.mod(i, 153), 5) + 1;
    var gm = this.mod(this.div(i, 153), 12) + 1;
    var gy = this.div(j, 1461) - 100100 + this.div(8 - gm, 6);
    return {
      gy: gy,
      gm: gm,
      gd: gd
    };
  }

  private div(a: number, b: number) {
    return ~~(a / b);
  }

  private mod(a: number, b: number) {
    return a - ~~(a / b) * b;
  }

  //#endregion jalali calendar

  // #region Template

  private mdDatePickerFlag = 'data-mdpersiandatetimepicker';
  private mdDatePickerFlagSelector = '[' + this.mdDatePickerFlag + ']';
  private mdDatePickerElementFlag = 'data-mdpersiandatetimepicker-element';
  private mdDatePickerElementSelector = '[' + this.mdDatePickerElementFlag + ']';
  private mdPersianDateTimePickerFlag = 'data-mds-date-time-picker';
  private mdDatePickerGroupIdAttribute = 'data-mdpersiandatetimepicker-group';
  private modalHtmlTemplate = `<div class="modal fade mds-bootstrap-persian-datetime-picker-modal" tabindex="-1" role="dialog" aria-labelledby="mdDateTimePickerModalLabel" aria-hidden="true" ${this.mdPersianDateTimePickerFlag}>
<div class="modal-dialog modal-xl modal-dialog-centered" data-button-selector>
<div class="modal-content">
<div class="modal-body" data-name="mds-datetimepicker-body">
MD DateTimePicker Html
</div>
</div>
</div>
</div>
  `;
  private popoverHtmlTemplate = `<div class="popover mds-bootstrap-persian-datetime-picker-popover" role="tooltip" ${this.mdPersianDateTimePickerFlag}>
<div class="popover-arrow"></div>
<h3 class="popover-header text-center p-1" data-name="mds-datetimepicker-title"></h3>
<div class="popover-body p-0" data-name="mds-datetimepicker-body"></div>
</div>`;
  private popoverHeaderSelectYearHtmlTemplate = `<table class="table table-sm table-borderless text-center p-0 m-0 {{rtlCssClass}}">
<tr>
<th>
<a href="javascript:void(0)" title="{{previousText}}" data-year="{{latestPreviousYear}}" data-year-range-button-change="-1"> &lt; </a>
</th>
<th>
{{yearsRangeText}}
</th>
<th>
<a href="javascript:void(0)" title="{{nextText}}" data-year="{{latestNextYear}}" data-year-range-button-change="1"> &gt; </a>
</th>
</tr>
</table>`;
  private dateTimePickerYearsToSelectHtmlTemplate = `<table class="table table-sm text-center p-0 m-0">
<tbody>
{{yearsToSelectHtml}}
</tbody>
</table>`;

  private dateTimePickerHtmlTemplate = `<div class="mds-bootstrap-persian-datetime-picker-container {{rtlCssClass}}" ${this.mdPersianDateTimePickerFlag}>
<div class="select-year-inline-box w-0" data-name="dateTimePickerYearsButtonsContainer">
</div>
<div class="select-year-box w-0" data-name="dateTimePickerYearsToSelectContainer">
</div>
<table class="table table-sm text-center p-0 m-0">
<thead>
<tr {{selectedDateStringAttribute}}>
<th colspan="100" data-selected-date-string>{{selectedDateString}}</th>
</tr>
</thead>
<tbody>
<tr>
{{monthsTdHtml}}
</tr>
</tbody>
<tfoot>
<tr {{timePickerAttribute}}>
<td colspan="100" class="border-0">
<table class="table table-sm table-borderless" data-time-picker-table>
<tbody>
<tr>
<td>
<input type="number" title="{{hourText}}" value="{{hour}}" maxlength="2" data-clock="hour" />
</td>
<td>:</td>
<td>
<input type="number" title="{{minuteText}}" value="{{minute}}" maxlength="2" data-clock="minute" />
</td>
<td>:</td>
<td>
<input type="number" title="{{secondText}}" value="{{second}}" maxlength="2" data-clock="second" />
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td colspan="100">
<button type="button" class="btn btn-light" title="{{goTodayText}}" data-go-today>{{todayDateString}}</button>
</td>
</tr>
</tfoot>
</table>
</div>`;

  private dateTimePickerMonthTableHtmlTemplate = `<td class="border-0" style="{{monthTdStyle}}" {{monthTdAttribute}} data-td-month>
<table class="table table-sm table-striped table-borderless">
<thead>
<tr {{monthNameAttribute}}>
<th colspan="100" class="border-0">
<table class="table table-sm table-borderless">
<thead>
<tr>
<th>
<button type="button" class="btn btn-light"> {{currentMonthInfo}} </button>
</th>
</tr>
</thead>
</table>
</th>
</tr>
<tr {{theadSelectDateButtonTrAttribute}}>
<td colspan="100" class="border-0">
<table class="table table-sm table-borderless">
<tr>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{previousYearText}}" data-change-date-button data-number="{{previousYearButtonDateNumber}}" {{previousYearButtonDisabledAttribute}}> &lt;&lt; </button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{previousMonthText}}" data-change-date-button data-number="{{previousMonthButtonDateNumber}}" {{previousMonthButtonDisabledAttribute}}> &lt; </button>
</th>
<th style="width: 120px;">
<div class="dropdown">
<button type="button" class="btn btn-light btn-sm dropdown-toggle" id="mdsBootstrapPersianDatetimePickerMonthSelectorButon"
data-bs-toggle="dropdown" aria-expanded="false">
{{selectedMonthName}}
</button>
<div class="dropdown-menu" aria-labelledby="mdsBootstrapPersianDatetimePickerMonthSelectorButon">
<a class="dropdown-item {{selectMonth1ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth1DateNumber}}">{{monthName1}}</a>
<a class="dropdown-item {{selectMonth2ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth2DateNumber}}">{{monthName2}}</a>
<a class="dropdown-item {{selectMonth3ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth3DateNumber}}">{{monthName3}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth4ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth4DateNumber}}">{{monthName4}}</a>
<a class="dropdown-item {{selectMonth5ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth5DateNumber}}">{{monthName5}}</a>
<a class="dropdown-item {{selectMonth6ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth6DateNumber}}">{{monthName6}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth7ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth7DateNumber}}">{{monthName7}}</a>
<a class="dropdown-item {{selectMonth8ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth8DateNumber}}">{{monthName8}}</a>
<a class="dropdown-item {{selectMonth9ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth9DateNumber}}">{{monthName9}}</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item {{selectMonth10ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth10DateNumber}}">{{monthName10}}</a>
<a class="dropdown-item {{selectMonth11ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth11DateNumber}}">{{monthName11}}</a>
<a class="dropdown-item {{selectMonth12ButtonCssClass}}" data-change-date-button data-number="{{dropDownMenuMonth12DateNumber}}">{{monthName12}}</a>
</div>
</div>
</th>
<th style="width: 50px;">
<button type="button" class="btn btn-light btn-sm" select-year-button {{selectYearButtonDisabledAttribute}}>{{selectedYear}}</button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{nextMonthText}}" data-change-date-button data-number="{{nextMonthButtonDateNumber}}" {{nextMonthButtonDisabledAttribute}}> &gt; </button>
</th>
<th>
<button type="button" class="btn btn-light btn-sm" title="{{nextYearText}}" data-change-date-button data-number="{{nextYearButtonDateNumber}}" {{nextYearButtonDisabledAttribute}}> &gt;&gt; </button>
</th>
</tr>
</table>
</td>
</tr>
</thead>
<tbody class="days">
<tr>
<td class="{{weekDayShortName1CssClass}}">{{weekDayShortName1}}</td>
<td>{{weekDayShortName2}}</td>
<td>{{weekDayShortName3}}</td>
<td>{{weekDayShortName4}}</td>
<td>{{weekDayShortName5}}</td>
<td>{{weekDayShortName6}}</td>
<td class="{{weekDayShortName7CssClass}}">{{weekDayShortName7}}</td>
</tr>
{{daysHtml}}
</tbody>
</table>
</td>`;

  private triggerChangeCalling = false;
  private previousYearTextPersian = 'سال قبل';
  private previousMonthTextPersian = 'ماه قبل';
  private previousTextPersian = 'قبلی';
  private nextYearTextPersian = 'سال بعد';
  private nextMonthTextPersian = 'ماه بعد';
  private nextTextPersian = 'بعدی';
  private hourTextPersian = 'ساعت';
  private minuteTextPersian = 'دقیقه';
  private secondTextPersian = 'ثانیه';
  private goTodayTextPersian = 'برو به امروز';
  private previousText = 'Previous';
  private previousYearText = 'Previous Year';
  private previousMonthText = 'Previous Month';
  private nextText = 'Next';
  private nextYearText = 'Next Year';
  private nextMonthText = 'Next Month';
  private goTodayText = 'Go Today';
  private hourText = 'Hour';
  private minuteText = 'Minute';
  private secondText = 'Second';
  private shortDayNamesPersian = [
    'ش',
    'ی',
    'د',
    'س',
    'چ',
    'پ',
    'ج',
  ];
  private shortDayNames = [
    'SU',
    'MO',
    'TU',
    'WE',
    'TH',
    'FR',
    'SA',
  ];
  private monthNamesPersian = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند'
  ];
  private monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  private weekDayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  private weekDayNamesPersian = [
    'یک شنبه',
    'دوشنبه',
    'سه شنبه',
    'چهارشنبه',
    'پنج شنبه',
    'جمعه',
    'شنبه'
  ];

  // #endregion

  // #region Properties

  private bsPopover: Popover;
  private element: Element;
  private setting: MdsPersianDateTimePickerSetting;

  // #endregion

  // #region Methods

  private newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  private extend(...args: any[]) {
    for (var i = 1; i < args.length; i++)
      for (var key in args[i])
        if (args[i].hasOwnProperty(key))
          args[0][key] = args[i][key];
    return args[0];
  }
  private getDateTimeJson1(dateTime: Date): GetDateTimeJson1 {
    return {
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1,
      day: dateTime.getDate(),
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      second: dateTime.getSeconds(),
      millisecond: dateTime.getMilliseconds(),
      dayOfWeek: dateTime.getDay()
    };
  }
  private getDateTimeJson2(dateNumber: number): GetDateTimeJson1 {
    return {
      year: Math.floor(dateNumber / 10000),
      month: Math.floor(dateNumber / 100) % 100,
      day: dateNumber % 100,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      dayOfWeek: null
    };
  }
  private getDateTimeJsonPersian1(dateTime: Date): GetDateTimeJson1 {
    var persianDate = this.toJalali(dateTime.getFullYear(), dateTime.getMonth() + 1, dateTime.getDate());
    return {
      year: persianDate.jy,
      month: persianDate.jm,
      day: persianDate.jd,
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      second: dateTime.getSeconds(),
      millisecond: dateTime.getMilliseconds(),
      dayOfWeek: dateTime.getDay(),
    };
  }
  private getDateTimeJsonPersian2(yearPersian: number, monthPersian: number, dayPersian: number, hour: number, minute: number, second: number) {
    if (!this.isNumber(hour)) hour = 0;
    if (!this.isNumber(minute)) minute = 0;
    if (!this.isNumber(second)) second = 0;
    var gregorian = this.toGregorian(yearPersian, monthPersian, dayPersian);
    return this.getDateTimeJsonPersian1(new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, hour, minute, second));
  }
  private getWeekDayName(englishWeekDayIndex: number, isGregorian: boolean) {
    if (!isGregorian) return this.weekDayNamesPersian[englishWeekDayIndex];
    return this.weekDayNames[englishWeekDayIndex];
  }
  private getMonthName(monthIndex: number, isGregorian: boolean) {
    if (!isGregorian) return this.monthNamesPersian[monthIndex];
    return this.monthNames[monthIndex];
  }
  private getWeekDayShortName(englishWeekDayIndex: number, isGregorian: boolean) {
    if (!isGregorian) return this.shortDayNamesPersian[englishWeekDayIndex];
    return this.shortDayNames[englishWeekDayIndex];
  }
  private isLeapYear(persianYear: number) {
    return this.isLeapJalaliYear(persianYear);
  }
  private getDaysInMonthPersian(year: number, month: number) {
    var numberOfDaysInMonth = 31;
    if (month > 6 && month < 12)
      numberOfDaysInMonth = 30;
    else if (month == 12)
      numberOfDaysInMonth = this.isLeapYear(year) ? 30 : 29;
    return numberOfDaysInMonth;
  }
  private getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }
  private getLastDayDateOfPreviousMonth(dateTime: Date, isGregorian: boolean) {
    var dateTimeLocal = this.getClonedDate(dateTime);
    if (isGregorian) {
      var previousMonth = new Date(dateTimeLocal.getFullYear(), dateTimeLocal.getMonth() - 1, 1),
        daysInMonth = this.getDaysInMonth(previousMonth.getFullYear(), previousMonth.getMonth());
      return new Date(previousMonth.getFullYear(), previousMonth.getMonth(), daysInMonth);
    }
    var dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTimeLocal);
    dateTimeJsonPersian.month += -1;
    if (dateTimeJsonPersian.month <= 0) {
      dateTimeJsonPersian.month = 12;
      dateTimeJsonPersian.year--;
    } else if (dateTimeJsonPersian.month > 12) {
      dateTimeJsonPersian.year++;
      dateTimeJsonPersian.month = 1;
    }
    return this.getDateTime1(dateTimeJsonPersian.year, dateTimeJsonPersian.month, this.getDaysInMonthPersian(dateTimeJsonPersian.year, dateTimeJsonPersian.month));
  }
  private getFirstDayDateOfNextMonth(dateTime: Date, isGregorian: boolean) {
    var dateTimeLocal = this.getClonedDate(dateTime);
    if (isGregorian) {
      var nextMonth = new Date(dateTimeLocal.getFullYear(), dateTimeLocal.getMonth() + 1, 1);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    }
    var dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTimeLocal);
    dateTimeJsonPersian.month += 1;
    if (dateTimeJsonPersian.month <= 0) {
      dateTimeJsonPersian.month = 12;
      dateTimeJsonPersian.year--;
    }
    if (dateTimeJsonPersian.month > 12) {
      dateTimeJsonPersian.year++;
      dateTimeJsonPersian.month = 1;
    }
    return this.getDateTime1(dateTimeJsonPersian.year, dateTimeJsonPersian.month, 1);
  }
  private getDateTime1(yearPersian: number, monthPersian: number, dayPersian: number, hour?: number, minute?: number, second?: number) {
    if (!this.isNumber(hour)) hour = 0;
    if (!this.isNumber(minute)) minute = 0;
    if (!this.isNumber(second)) second = 0;
    var gregorian = this.toGregorian(yearPersian, monthPersian, dayPersian);
    return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, hour, minute, second);
  }
  private getDateTime2(dateTimeJsonPersian: GetDateTimeJson1) {
    if (!dateTimeJsonPersian.hour) dateTimeJsonPersian.hour = 0;
    if (!dateTimeJsonPersian.minute) dateTimeJsonPersian.minute = 0;
    if (!dateTimeJsonPersian.second) dateTimeJsonPersian.second = 0;
    var gregorian = this.toGregorian(dateTimeJsonPersian.year, dateTimeJsonPersian.month, dateTimeJsonPersian.day);
    return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd, dateTimeJsonPersian.hour, dateTimeJsonPersian.minute, dateTimeJsonPersian.second);
  }
  private getDateTime3(dateTimeJson: GetDateTimeJson1) {
    return new Date(dateTimeJson.year, dateTimeJson.month - 1, dateTimeJson.day, dateTimeJson.hour, dateTimeJson.minute, dateTimeJson.second);
  }
  private getDateTime4(dateNumber: number, dateTime: Date, isGregorian: boolean) {
    var dateTimeJson = this.getDateTimeJson2(dateNumber);
    if (!isGregorian) {
      var dateTimeJsonPersian = this.getDateTimeJsonPersian1(dateTime);
      dateTimeJsonPersian.year = dateTimeJson.year;
      dateTimeJsonPersian.month = dateTimeJson.month;
      dateTimeJsonPersian.day = dateTimeJson.day;
      dateTime = this.getDateTime2(dateTimeJsonPersian);
    } else
      dateTime = new Date(dateTimeJson.year, dateTimeJson.month - 1, dateTimeJson.day,
        dateTime.getHours(), dateTime.getMinutes(), dateTime.getSeconds());
    return dateTime;
  }
  private addMonthToDateTimeJson(dateTimeJson: GetDateTimeJson1, addedMonth: number, isGregorian: boolean) {
    // وقتی نیاز هست تا ماه یا روز به تاریخی اضافه کنم
    // پس از اضافه کردن ماه یا روز این متد را استفاده میکنم تا سال و ماه
    // با مقادیر جدید تصحیح و برگشت داده شوند
    const dateTimeJson1 = Object.assign({}, dateTimeJson);
    dateTimeJson1.day = 1;
    dateTimeJson1.month += addedMonth;
    if (!isGregorian) {
      if (dateTimeJson1.month <= 0) {
        dateTimeJson1.month = 12;
        dateTimeJson1.year--;
      }
      if (dateTimeJson1.month > 12) {
        dateTimeJson1.year++;
        dateTimeJson1.month = 1;
      }
      return dateTimeJson1;
    }
    return this.getDateTimeJson1(this.getDateTime3(dateTimeJson1));
  }
  private convertToNumber1(dateTimeJson: GetDateTimeJson1): number {
    return Number(this.zeroPad(dateTimeJson.year) + this.zeroPad(dateTimeJson.month) + this.zeroPad(dateTimeJson.day));
  }
  private convertToNumber2(year: number, month: number, day: number) {
    return Number(this.zeroPad(year) + this.zeroPad(month) + this.zeroPad(day));
  }
  private convertToNumber3(dateTime: Date) {
    return this.convertToNumber1(this.getDateTimeJson1(dateTime));
  }
  private convertToNumber4(dateTime: Date) {
    return Number(this.zeroPad(dateTime.getFullYear()) + this.zeroPad(dateTime.getMonth()) + this.zeroPad(dateTime.getDate()));
  }
  private getShortHour(hour: number): number {
    var shortHour;
    if (hour > 12)
      shortHour = hour - 12;
    else
      shortHour = hour;
    return shortHour;
  }
  private getAmPm(hour: number, isGregorian: boolean): string {
    var amPm;
    if (hour > 12) {
      if (isGregorian)
        amPm = 'PM';
      else
        amPm = 'ب.ظ';
    } else
      if (isGregorian)
        amPm = 'AM';
      else
        amPm = 'ق.ظ';
    return amPm;
  }
  private addMonthToDateTime(dateTime: Date, addedMonth: number, isGregorian: boolean) {
    let dateTimeJson: GetDateTimeJson1;
    if (!isGregorian) {
      dateTimeJson = this.getDateTimeJsonPersian1(dateTime);
      dateTimeJson = this.addMonthToDateTimeJson(dateTimeJson, addedMonth, isGregorian);
      return this.getDateTime2(dateTimeJson);
    }
    dateTimeJson = this.getDateTimeJson1(dateTime);
    dateTimeJson = this.addMonthToDateTimeJson(dateTimeJson, addedMonth, isGregorian);
    return this.getDateTime3(dateTimeJson);
  }
  private isNumber(n: any) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  private toPersianNumber(inputNumber1: number | string) {
    /* ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ */
    if (!inputNumber1) return '';
    var str1 = inputNumber1.toString().trim();
    if (!str1) return '';
    str1 = str1.replace(/0/img, '۰');
    str1 = str1.replace(/1/img, '۱');
    str1 = str1.replace(/2/img, '۲');
    str1 = str1.replace(/3/img, '۳');
    str1 = str1.replace(/4/img, '۴');
    str1 = str1.replace(/5/img, '۵');
    str1 = str1.replace(/6/img, '۶');
    str1 = str1.replace(/7/img, '۷');
    str1 = str1.replace(/8/img, '۸');
    str1 = str1.replace(/9/img, '۹');
    return str1;
  }
  private toEnglishNumber(inputNumber2: number | string) {
    if (!inputNumber2) return '';
    var str = inputNumber2.toString().trim();
    if (!str) return '';
    str = str.replace(/۰/img, '0');
    str = str.replace(/۱/img, '1');
    str = str.replace(/۲/img, '2');
    str = str.replace(/۳/img, '3');
    str = str.replace(/۴/img, '4');
    str = str.replace(/۵/img, '5');
    str = str.replace(/۶/img, '6');
    str = str.replace(/۷/img, '7');
    str = str.replace(/۸/img, '8');
    str = str.replace(/۹/img, '9');
    return str;
  }
  private getClonedDate(dateTime: Date): Date {
    return new Date(dateTime.getTime());
  }
  private zeroPad(nr: any, base?: string): string {
    if (nr == undefined || nr == '') return '00';
    if (base == undefined || base == '') base = '00';
    var len = (String(base).length - String(nr).length) + 1;
    return len > 0 ? new Array(len).join('0') + nr : nr;
  }
  private getDateTimeString(dateTimeJson: GetDateTimeJson1, format: string, isGregorian: boolean, englishNumber: boolean) {

    if (isGregorian) englishNumber = true;

    /// فرمت های که پشتیبانی می شوند
    /// <para />
    /// yyyy: سال چهار رقمی
    /// <para />
    /// yy: سال دو رقمی
    /// <para />
    /// MMMM: نام فارسی ماه
    /// <para />
    /// MM: عدد دو رقمی ماه
    /// <para />
    /// M: عدد یک رقمی ماه
    /// <para />
    /// dddd: نام فارسی روز هفته
    /// <para />
    /// dd: عدد دو رقمی روز ماه
    /// <para />
    /// d: عدد یک رقمی روز ماه
    /// <para />
    /// HH: ساعت دو رقمی با فرمت 00 تا 24
    /// <para />
    /// H: ساعت یک رقمی با فرمت 0 تا 24
    /// <para />
    /// hh: ساعت دو رقمی با فرمت 00 تا 12
    /// <para />
    /// h: ساعت یک رقمی با فرمت 0 تا 12
    /// <para />
    /// mm: عدد دو رقمی دقیقه
    /// <para />
    /// m: عدد یک رقمی دقیقه
    /// <para />
    /// ss: ثانیه دو رقمی
    /// <para />
    /// s: ثانیه یک رقمی
    /// <para />
    /// fff: میلی ثانیه 3 رقمی
    /// <para />
    /// ff: میلی ثانیه 2 رقمی
    /// <para />
    /// f: میلی ثانیه یک رقمی
    /// <para />
    /// tt: ب.ظ یا ق.ظ
    /// <para />
    /// t: حرف اول از ب.ظ یا ق.ظ

    format = format.replace(/yyyy/mg, dateTimeJson.year.toString());
    format = format.replace(/yy/mg, (dateTimeJson.year % 100).toString());
    format = format.replace(/MMMM/mg, this.getMonthName(dateTimeJson.month - 1, isGregorian));
    format = format.replace(/MM/mg, this.zeroPad(dateTimeJson.month));
    format = format.replace(/M/mg, dateTimeJson.month.toString());
    format = format.replace(/dddd/mg, this.getWeekDayName(dateTimeJson.dayOfWeek, isGregorian));
    format = format.replace(/dd/mg, this.zeroPad(dateTimeJson.day));
    format = format.replace(/d/mg, dateTimeJson.day.toString());
    format = format.replace(/HH/mg, this.zeroPad(dateTimeJson.hour));
    format = format.replace(/H/mg, dateTimeJson.hour.toString());
    format = format.replace(/hh/mg, this.zeroPad(this.getShortHour(dateTimeJson.hour).toString()));
    format = format.replace(/h/mg, this.zeroPad(dateTimeJson.hour));
    format = format.replace(/mm/mg, this.zeroPad(dateTimeJson.minute));
    format = format.replace(/m/mg, dateTimeJson.minute.toString());
    format = format.replace(/ss/mg, this.zeroPad(dateTimeJson.second));
    format = format.replace(/s/mg, dateTimeJson.second.toString());
    format = format.replace(/fff/mg, this.zeroPad(dateTimeJson.millisecond, '000'));
    format = format.replace(/ff/mg, this.zeroPad(dateTimeJson.millisecond / 10));
    format = format.replace(/f/mg, (dateTimeJson.millisecond / 100).toString());
    format = format.replace(/tt/mg, this.getAmPm(dateTimeJson.hour, isGregorian));
    format = format.replace(/t/mg, this.getAmPm(dateTimeJson.hour, isGregorian)[0]);

    if (!englishNumber) format = this.toPersianNumber(format);
    return format;
  }
  private isPopoverDescriber(element: Element): boolean {
    return element.getAttribute('aria-describedby') != undefined;
  }
  private getPopover(element: Element): Element {
    return document.getElementById('#' + element.getAttribute('aria-describedby'));
  }
  private getDateTimePickerMonthHtml1(setting: MdsPersianDateTimePickerSetting, isNextMonth: boolean, isPrevMonth: boolean): string {
    let selectedDateToShow = this.getClonedDate(setting.selectedDateToShow),
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow),
      selectedDateTime = setting.selectedDate != undefined ? this.getClonedDate(setting.selectedDate) : undefined,
      isNextOrPrevMonth = isNextMonth || isPrevMonth,
      html = this.dateTimePickerMonthTableHtmlTemplate;

    html = html.replace(/{{monthTdAttribute}}/img, isNextMonth ? 'data-next-month' : isPrevMonth ? 'data-prev-month' : '');
    html = html.replace(/{{monthNameAttribute}}/img, !isNextOrPrevMonth ? 'hidden' : '');
    html = html.replace(/{{theadSelectDateButtonTrAttribute}}/img, setting.inLine || !isNextOrPrevMonth ? '' : 'hidden');
    html = html.replace(/{{weekDayShortName1CssClass}}/img, setting.isGregorian ? 'text-danger' : '');
    html = html.replace(/{{weekDayShortName7CssClass}}/img, !setting.isGregorian ? 'text-danger' : '');
    html = html.replace(/{{previousYearText}}/img, setting.isGregorian ? this.previousYearText : this.previousYearTextPersian);
    html = html.replace(/{{previousMonthText}}/img, setting.isGregorian ? this.previousMonthText : this.previousMonthTextPersian);
    html = html.replace(/{{nextMonthText}}/img, setting.isGregorian ? this.nextMonthText : this.nextMonthTextPersian);
    html = html.replace(/{{nextYearText}}/img, setting.isGregorian ? this.nextYearText : this.nextYearTextPersian);
    html = html.replace(/{{monthName1}}/img, this.getMonthName(0, setting.isGregorian));
    html = html.replace(/{{monthName2}}/img, this.getMonthName(1, setting.isGregorian));
    html = html.replace(/{{monthName3}}/img, this.getMonthName(2, setting.isGregorian));
    html = html.replace(/{{monthName4}}/img, this.getMonthName(3, setting.isGregorian));
    html = html.replace(/{{monthName5}}/img, this.getMonthName(4, setting.isGregorian));
    html = html.replace(/{{monthName6}}/img, this.getMonthName(5, setting.isGregorian));
    html = html.replace(/{{monthName7}}/img, this.getMonthName(6, setting.isGregorian));
    html = html.replace(/{{monthName8}}/img, this.getMonthName(7, setting.isGregorian));
    html = html.replace(/{{monthName9}}/img, this.getMonthName(8, setting.isGregorian));
    html = html.replace(/{{monthName10}}/img, this.getMonthName(9, setting.isGregorian));
    html = html.replace(/{{monthName11}}/img, this.getMonthName(10, setting.isGregorian));
    html = html.replace(/{{monthName12}}/img, this.getMonthName(11, setting.isGregorian));
    html = html.replace(/{{weekDayShortName1}}/img, this.getWeekDayShortName(0, setting.isGregorian));
    html = html.replace(/{{weekDayShortName2}}/img, this.getWeekDayShortName(1, setting.isGregorian));
    html = html.replace(/{{weekDayShortName3}}/img, this.getWeekDayShortName(2, setting.isGregorian));
    html = html.replace(/{{weekDayShortName4}}/img, this.getWeekDayShortName(3, setting.isGregorian));
    html = html.replace(/{{weekDayShortName5}}/img, this.getWeekDayShortName(4, setting.isGregorian));
    html = html.replace(/{{weekDayShortName6}}/img, this.getWeekDayShortName(5, setting.isGregorian));
    html = html.replace(/{{weekDayShortName7}}/img, this.getWeekDayShortName(6, setting.isGregorian));

    let i = 0,
      j = 0,
      firstWeekDayNumber,
      cellNumber = 0,
      tdNumber = 0,
      selectedYear = '',
      selectedDateNumber = 0,
      selectedMonthName = '',
      todayDateNumber = 0,
      todayDateTimeJson: GetDateTimeJson1, // year, month, day, hour, minute, second
      dateTimeToShowJson: GetDateTimeJson1, // year, month, day, hour, minute, second
      numberOfDaysInCurrentMonth = 0,
      numberOfDaysInPreviousMonth = 0,
      tr = document.createElement('TR'),
      td = document.createElement("TD"),
      daysHtml = '',
      currentDateNumber = 0,
      currentMonthInfo = '',
      previousMonthDateNumber = 0,
      nextMonthDateNumber = 0,
      previousYearDateNumber = 0,
      nextYearDateNumber = 0,
      disableBeforeDateTimeNumber = 0,
      disableAfterDateTimeNumber = 0,
      rangeSelectorStartDate = !setting.rangeSelector || setting.rangeSelectorStartDate == undefined ? undefined : this.getClonedDate(setting.rangeSelectorStartDate),
      rangeSelectorEndDate = !setting.rangeSelector || setting.rangeSelectorEndDate == undefined ? undefined : this.getClonedDate(setting.rangeSelectorEndDate),
      rangeSelectorStartDateNumber = 0,
      rangeSelectorEndDateNumber = 0,
      dayNumberInString = '0',
      dayOfWeek = '', // نام روز هفته
      monthsDateNumberAndAttr: any = {
        month1DateNumber: 0,
        month2DateNumber: 0,
        month3DateNumber: 0,
        month4DateNumber: 0,
        month5DateNumber: 0,
        month6DateNumber: 0,
        month7DateNumber: 0,
        month8DateNumber: 0,
        month9DateNumber: 0,
        month10DateNumber: 0,
        month11DateNumber: 0,
        month12DateNumber: 0,
        selectMonth1ButtonCssClass: '',
        selectMonth2ButtonCssClass: '',
        selectMonth3ButtonCssClass: '',
        selectMonth4ButtonCssClass: '',
        selectMonth5ButtonCssClass: '',
        selectMonth6ButtonCssClass: '',
        selectMonth7ButtonCssClass: '',
        selectMonth8ButtonCssClass: '',
        selectMonth9ButtonCssClass: '',
        selectMonth10ButtonCssClass: '',
        selectMonth11ButtonCssClass: '',
        selectMonth12ButtonCssClass: '',
      },
      holidaysDateNumbers: number[] = [],
      disabledDatesNumber: number[] = [],
      specialDatesNumber: number[] = [],
      disableBeforeDateTimeJson: GetDateTimeJson1,
      disableAfterDateTimeJson: GetDateTimeJson1,
      previousYearButtonDisabledAttribute = '',
      previousMonthButtonDisabledAttribute = '',
      selectYearButtonDisabledAttribute = '',
      nextMonthButtonDisabledAttribute = '',
      nextYearButtonDisabledAttribute = '',
      isTrAppended = false;

    if (setting.isGregorian) {
      dateTimeToShowJson = this.getDateTimeJson1(selectedDateToShowTemp);
      todayDateTimeJson = this.getDateTimeJson1(new Date());
      disableBeforeDateTimeJson = !setting.disableBeforeDate ? undefined : this.getDateTimeJson1(setting.disableBeforeDate);
      disableAfterDateTimeJson = !setting.disableAfterDate ? undefined : this.getDateTimeJson1(setting.disableAfterDate);
      firstWeekDayNumber = new Date(dateTimeToShowJson.year, dateTimeToShowJson.month - 1, 1).getDay();
      selectedDateNumber = !selectedDateTime ? 0 : this.convertToNumber1(this.getDateTimeJson1(selectedDateTime));
      numberOfDaysInCurrentMonth = this.getDaysInMonth(dateTimeToShowJson.year, dateTimeToShowJson.month - 1);
      numberOfDaysInPreviousMonth = this.getDaysInMonth(dateTimeToShowJson.year, dateTimeToShowJson.month - 2);
      previousMonthDateNumber = this.convertToNumber1(this.getDateTimeJson1(this.getLastDayDateOfPreviousMonth(selectedDateToShowTemp, true)));
      nextMonthDateNumber = this.convertToNumber1(this.getDateTimeJson1(this.getFirstDayDateOfNextMonth(selectedDateToShowTemp, true)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      previousYearDateNumber = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setFullYear(selectedDateToShowTemp.getFullYear() - 1))));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      nextYearDateNumber = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setFullYear(selectedDateToShowTemp.getFullYear() + 1))));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      rangeSelectorStartDateNumber = !setting.rangeSelector || !rangeSelectorStartDate ? 0 : this.convertToNumber3(rangeSelectorStartDate);
      rangeSelectorEndDateNumber = !setting.rangeSelector || !rangeSelectorEndDate ? 0 : this.convertToNumber3(rangeSelectorEndDate);
      for (i = 1; i <= 12; i++) {
        monthsDateNumberAndAttr['month' + i.toString() + 'DateNumber'] = this.convertToNumber1(this.getDateTimeJson1(new Date(selectedDateToShowTemp.setMonth(i - 1))));
        selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      }
      for (i = 0; i < setting.holiDays.length; i++) {
        holidaysDateNumbers.push(this.convertToNumber1(this.getDateTimeJson1(setting.holiDays[i])));
      }
      for (i = 0; i < setting.disabledDates.length; i++) {
        disabledDatesNumber.push(this.convertToNumber1(this.getDateTimeJson1(setting.disabledDates[i])));
      }
      for (i = 0; i < setting.specialDates.length; i++) {
        specialDatesNumber.push(this.convertToNumber1(this.getDateTimeJson1(setting.specialDates[i])));
      }
    } else {
      dateTimeToShowJson = this.getDateTimeJsonPersian1(selectedDateToShowTemp);
      todayDateTimeJson = this.getDateTimeJsonPersian1(new Date());
      disableBeforeDateTimeJson = !setting.disableBeforeDate ? undefined : this.getDateTimeJsonPersian1(setting.disableBeforeDate);
      disableAfterDateTimeJson = !setting.disableAfterDate ? undefined : this.getDateTimeJsonPersian1(setting.disableAfterDate);
      firstWeekDayNumber = this.getDateTimeJsonPersian2(dateTimeToShowJson.year, dateTimeToShowJson.month, 1, 0, 0, 0).dayOfWeek;
      selectedDateNumber = !selectedDateTime ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(selectedDateTime));
      numberOfDaysInCurrentMonth = this.getDaysInMonthPersian(dateTimeToShowJson.year, dateTimeToShowJson.month);
      numberOfDaysInPreviousMonth = this.getDaysInMonthPersian(dateTimeToShowJson.year - 1, dateTimeToShowJson.month - 1);
      previousMonthDateNumber = this.convertToNumber1(this.getDateTimeJsonPersian1(this.getLastDayDateOfPreviousMonth(selectedDateToShowTemp, false)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      nextMonthDateNumber = this.convertToNumber1(this.getDateTimeJsonPersian1(this.getFirstDayDateOfNextMonth(selectedDateToShowTemp, false)));
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      previousYearDateNumber = this.convertToNumber2(dateTimeToShowJson.year - 1, dateTimeToShowJson.month, dateTimeToShowJson.day);
      nextYearDateNumber = this.convertToNumber2(dateTimeToShowJson.year + 1, dateTimeToShowJson.month, dateTimeToShowJson.day);
      selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      rangeSelectorStartDateNumber = !setting.rangeSelector || !rangeSelectorStartDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorStartDate));
      rangeSelectorEndDateNumber = !setting.rangeSelector || !rangeSelectorEndDate ? 0 : this.convertToNumber1(this.getDateTimeJsonPersian1(rangeSelectorEndDate));
      for (i = 1; i <= 12; i++) {
        monthsDateNumberAndAttr['month' + i.toString() + 'DateNumber'] = this.convertToNumber2(dateTimeToShowJson.year, i, this.getDaysInMonthPersian(dateTimeToShowJson.year, i));
        selectedDateToShowTemp = this.getClonedDate(selectedDateToShow);
      }
      for (i = 0; i < setting.holiDays.length; i++) {
        holidaysDateNumbers.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.holiDays[i])));
      }
      for (i = 0; i < setting.disabledDates.length; i++) {
        disabledDatesNumber.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.disabledDates[i])));
      }
      for (i = 0; i < setting.specialDates.length; i++) {
        specialDatesNumber.push(this.convertToNumber1(this.getDateTimeJsonPersian1(setting.specialDates[i])));
      }
    }

    // بررسی پراپرتی های از تاریخ، تا تاریخ
    if ((setting.fromDate || setting.toDate) && setting.groupId) {
      const toDateElement = document.querySelector('[' + this.mdDatePickerGroupIdAttribute + '="' + setting.groupId + '"][data-toDate]');
      const fromDateElement = document.querySelector('[' + this.mdDatePickerGroupIdAttribute + '="' + setting.groupId + '"][data-fromDate]');
      if (setting.fromDate && toDateElement != null) {
        const toDateMdsInstance = MdsPersianDateTimePicker.getInstance(toDateElement);
        if (toDateMdsInstance != null) {
          const toDateSelectedDate = toDateMdsInstance.setting.selectedDate;
          disableAfterDateTimeJson = !toDateSelectedDate ? undefined : setting.isGregorian ? this.getDateTimeJson1(toDateSelectedDate) : this.getDateTimeJsonPersian1(toDateSelectedDate);
        }
      } else if (setting.toDate && fromDateElement != null) {
        const fromDateInstance = MdsPersianDateTimePicker.getInstance(fromDateElement);
        if (fromDateInstance != null) {
          const fromDateSelectedDate = fromDateInstance.setting.selectedDate;
          disableBeforeDateTimeJson = !fromDateSelectedDate ? undefined : setting.isGregorian ? this.getDateTimeJson1(fromDateSelectedDate) : this.getDateTimeJsonPersian1(fromDateSelectedDate);
        }
      }
    }

    todayDateNumber = this.convertToNumber1(todayDateTimeJson);
    selectedYear = setting.englishNumber ? dateTimeToShowJson.year.toString() : this.toPersianNumber(dateTimeToShowJson.year);
    disableBeforeDateTimeNumber = !disableBeforeDateTimeJson ? undefined : this.convertToNumber1(disableBeforeDateTimeJson);
    disableAfterDateTimeNumber = !disableAfterDateTimeJson ? undefined : this.convertToNumber1(disableAfterDateTimeJson);
    currentMonthInfo = this.getMonthName(dateTimeToShowJson.month - 1, setting.isGregorian) + ' ' + dateTimeToShowJson.year.toString();
    if (!setting.englishNumber) currentMonthInfo = this.toPersianNumber(currentMonthInfo);
    selectedMonthName = this.getMonthName(dateTimeToShowJson.month - 1, setting.isGregorian);

    if (setting.yearOffset <= 0) {
      previousYearButtonDisabledAttribute = 'disabled';
      nextYearButtonDisabledAttribute = 'disabled';
      selectYearButtonDisabledAttribute = 'disabled';
    }

    // روز های ماه قبل
    if (firstWeekDayNumber != 6) {
      if (setting.isGregorian) firstWeekDayNumber--;
      var previousMonthDateTimeJson = this.addMonthToDateTimeJson(dateTimeToShowJson, -1, setting.isGregorian);
      for (i = numberOfDaysInPreviousMonth - firstWeekDayNumber; i <= numberOfDaysInPreviousMonth; i++) {
        currentDateNumber = this.convertToNumber2(previousMonthDateTimeJson.year, previousMonthDateTimeJson.month, i);
        dayNumberInString = setting.englishNumber ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));
        td = document.createElement('TD');
        td.setAttribute('data-nm', '');
        td.setAttribute('data-number', currentDateNumber.toString());
        td.innerHTML = dayNumberInString;
        if (setting.rangeSelector) {
          if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
            td.classList.add('selected-range-days-start-end');
          else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
            td.classList.add('selected-range-days');
        }
        // روز جمعه
        if (!setting.isGregorian && tdNumber == 6)
          td.classList.add('text-danger');
        // روز یکشنبه
        else if (setting.isGregorian && tdNumber == 0)
          td.classList.add('text-danger');
        tr.appendChild(td);
        cellNumber++;
        tdNumber++;
        if (tdNumber >= 7) {
          tdNumber = 0;
          daysHtml += tr.outerHTML;
          isTrAppended = true;
          tr = document.createElement('TR');
        }
      }
    }

    // روزهای ماه جاری
    for (i = 1; i <= numberOfDaysInCurrentMonth; i++) {

      if (tdNumber >= 7) {
        tdNumber = 0;
        daysHtml += tr.outerHTML;
        isTrAppended = true;
        tr = document.createElement('TR');
      }

      // عدد روز
      currentDateNumber = this.convertToNumber2(dateTimeToShowJson.year, dateTimeToShowJson.month, i);
      dayNumberInString = setting.englishNumber ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));

      td = document.createElement('TD');
      td.setAttribute('data-day', '');
      td.setAttribute('data-number', currentDateNumber.toString());
      td.innerHTML = dayNumberInString;

      // امروز
      if (currentDateNumber == todayDateNumber) {
        td.setAttribute('data-today', '');
        // اگر نام روز هفته انتخاب شده در تکس باکس قبل از تاریخ امروز باشد
        // نباید دیگر نام روز هفته تغییر کند
        if (!dayOfWeek)
          dayOfWeek = this.getWeekDayName(tdNumber - 1 < 0 ? 0 : tdNumber - 1, setting.isGregorian);
      }

      // روز از قبل انتخاب شده
      if (!setting.rangeSelector && selectedDateNumber == currentDateNumber) {
        td.setAttribute('data-selectedday', '');
        dayOfWeek = this.getWeekDayName(tdNumber - 1 < 0 ? 0 : tdNumber - 1, setting.isGregorian);
      }

      // روزهای تعطیل
      for (j = 0; j < holidaysDateNumbers.length; j++) {
        if (holidaysDateNumbers[j] != currentDateNumber) continue;
        td.classList.add('text-danger');
        break;
      }

      // روز جمعه شمسی
      if (!setting.isGregorian && tdNumber == 6) {
        td.classList.add('text-danger');
      }
      // روز یکشنبه میلادی
      else if (setting.isGregorian && tdNumber == 0) {
        td.classList.add('text-danger');
      }

      // روزهای غیر فعال شده
      if (setting.disableBeforeToday) {
        if (currentDateNumber < todayDateNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber < todayDateNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber < todayDateNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber < todayDateNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber < todayDateNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] < todayDateNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (setting.disableAfterToday) {
        if (currentDateNumber > todayDateNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber > todayDateNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber > todayDateNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber > todayDateNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber > todayDateNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] > todayDateNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (disableAfterDateTimeNumber) {
        if (currentDateNumber > disableAfterDateTimeNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber > disableAfterDateTimeNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber > disableAfterDateTimeNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber > disableAfterDateTimeNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber > disableAfterDateTimeNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] > disableAfterDateTimeNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      if (disableBeforeDateTimeNumber) {
        if (currentDateNumber < disableBeforeDateTimeNumber) td.setAttribute('disabled', '');
        if (nextMonthDateNumber < disableBeforeDateTimeNumber)
          nextMonthButtonDisabledAttribute = 'disabled';
        if (nextYearDateNumber < disableBeforeDateTimeNumber)
          nextYearButtonDisabledAttribute = 'disabled';
        if (previousMonthDateNumber < disableBeforeDateTimeNumber)
          previousMonthButtonDisabledAttribute = 'disabled';
        if (previousYearDateNumber < disableBeforeDateTimeNumber)
          previousYearButtonDisabledAttribute = 'disabled';
        for (j = 1; j <= 12; j++) {
          if (monthsDateNumberAndAttr['month' + j.toString() + 'DateNumber'] < disableBeforeDateTimeNumber)
            monthsDateNumberAndAttr['selectMonth' + j.toString() + 'ButtonCssClass'] = 'disabled';
        }
      }
      for (j = 0; j < disabledDatesNumber.length; j++) {
        if (currentDateNumber == disabledDatesNumber[j])
          td.setAttribute('disabled', '');
      }
      for (j = 0; j < specialDatesNumber.length; j++) {
        if (currentDateNumber == specialDatesNumber[j])
          td.setAttribute('data-special-date', '');
      }
      if (setting.disabledDays && setting.disabledDays.indexOf(tdNumber) >= 0) {
        td.setAttribute('disabled', '');
      }
      // \\

      if (setting.rangeSelector) {
        if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days-start-end');
        else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days');
      }

      tr.appendChild(td);
      isTrAppended = false;

      tdNumber++;
      cellNumber++;
    }

    if (tdNumber >= 7) {
      tdNumber = 0;
      daysHtml += tr.outerHTML;
      isTrAppended = true;
      tr = document.createElement('TR');
    }

    // روزهای ماه بعد
    var nextMonthDateTimeJson = this.addMonthToDateTimeJson(dateTimeToShowJson, 1, setting.isGregorian);
    for (i = 1; i <= 42 - cellNumber; i++) {
      dayNumberInString = setting.englishNumber ? this.zeroPad(i) : this.toPersianNumber(this.zeroPad(i));
      currentDateNumber = this.convertToNumber2(nextMonthDateTimeJson.year, nextMonthDateTimeJson.month, i);
      td = document.createElement('TD');
      td.setAttribute('data-nm', '');
      td.setAttribute('data-number', currentDateNumber.toString());
      td.innerHTML = dayNumberInString;
      if (setting.rangeSelector) {
        if (currentDateNumber == rangeSelectorStartDateNumber || currentDateNumber == rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days-start-end');
        else if (rangeSelectorStartDateNumber > 0 && rangeSelectorEndDateNumber > 0 && currentDateNumber > rangeSelectorStartDateNumber && currentDateNumber < rangeSelectorEndDateNumber)
          td.classList.add('selected-range-days');
      }
      // روز جمعه
      if (!setting.isGregorian && tdNumber == 6)
        td.classList.add('text-danger');
      // روز یکشنبه
      else if (setting.isGregorian && tdNumber == 0)
        td.classList.add('text-danger');
      tr.appendChild(td);
      tdNumber++;
      if (tdNumber >= 7) {
        tdNumber = 0;
        daysHtml += tr.outerHTML;
        isTrAppended = true;
        tr = document.createElement('TR');
      }
    }

    if (!isTrAppended) {
      daysHtml += tr.outerHTML;
      isTrAppended = true;
    }

    html = html.replace(/{{currentMonthInfo}}/img, currentMonthInfo);
    html = html.replace(/{{selectedYear}}/img, selectedYear);
    html = html.replace(/{{selectedMonthName}}/img, selectedMonthName);
    html = html.replace(/{{daysHtml}}/img, daysHtml);
    html = html.replace(/{{previousYearButtonDisabledAttribute}}/img, previousYearButtonDisabledAttribute);
    html = html.replace(/{{previousYearButtonDateNumber}}/img, previousYearDateNumber.toString());
    html = html.replace(/{{previousMonthButtonDisabledAttribute}}/img, previousMonthButtonDisabledAttribute);
    html = html.replace(/{{previousMonthButtonDateNumber}}/img, previousMonthDateNumber.toString());
    html = html.replace(/{{selectYearButtonDisabledAttribute}}/img, selectYearButtonDisabledAttribute);
    html = html.replace(/{{nextMonthButtonDisabledAttribute}}/img, nextMonthButtonDisabledAttribute);
    html = html.replace(/{{nextMonthButtonDateNumber}}/img, nextMonthDateNumber.toString());
    html = html.replace(/{{nextYearButtonDisabledAttribute}}/img, nextYearButtonDisabledAttribute);
    html = html.replace(/{{nextYearButtonDateNumber}}/img, nextYearDateNumber.toString());
    html = html.replace(/{{dropDownMenuMonth1DateNumber}}/img, monthsDateNumberAndAttr.month1DateNumber);
    html = html.replace(/{{dropDownMenuMonth2DateNumber}}/img, monthsDateNumberAndAttr.month2DateNumber);
    html = html.replace(/{{dropDownMenuMonth3DateNumber}}/img, monthsDateNumberAndAttr.month3DateNumber);
    html = html.replace(/{{dropDownMenuMonth4DateNumber}}/img, monthsDateNumberAndAttr.month4DateNumber);
    html = html.replace(/{{dropDownMenuMonth5DateNumber}}/img, monthsDateNumberAndAttr.month5DateNumber);
    html = html.replace(/{{dropDownMenuMonth6DateNumber}}/img, monthsDateNumberAndAttr.month6DateNumber);
    html = html.replace(/{{dropDownMenuMonth7DateNumber}}/img, monthsDateNumberAndAttr.month7DateNumber);
    html = html.replace(/{{dropDownMenuMonth8DateNumber}}/img, monthsDateNumberAndAttr.month8DateNumber);
    html = html.replace(/{{dropDownMenuMonth9DateNumber}}/img, monthsDateNumberAndAttr.month9DateNumber);
    html = html.replace(/{{dropDownMenuMonth10DateNumber}}/img, monthsDateNumberAndAttr.month10DateNumber);
    html = html.replace(/{{dropDownMenuMonth11DateNumber}}/img, monthsDateNumberAndAttr.month11DateNumber);
    html = html.replace(/{{dropDownMenuMonth12DateNumber}}/img, monthsDateNumberAndAttr.month12DateNumber);
    html = html.replace(/{{selectMonth1ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth1ButtonCssClass);
    html = html.replace(/{{selectMonth2ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth2ButtonCssClass);
    html = html.replace(/{{selectMonth3ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth3ButtonCssClass);
    html = html.replace(/{{selectMonth4ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth4ButtonCssClass);
    html = html.replace(/{{selectMonth5ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth5ButtonCssClass);
    html = html.replace(/{{selectMonth6ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth6ButtonCssClass);
    html = html.replace(/{{selectMonth7ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth7ButtonCssClass);
    html = html.replace(/{{selectMonth8ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth8ButtonCssClass);
    html = html.replace(/{{selectMonth9ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth9ButtonCssClass);
    html = html.replace(/{{selectMonth10ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth10ButtonCssClass);
    html = html.replace(/{{selectMonth11ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth11ButtonCssClass);
    html = html.replace(/{{selectMonth12ButtonCssClass}}/img, monthsDateNumberAndAttr.selectMonth12ButtonCssClass);

    return html;
  }
  private getPopoverHeaderHtml(setting: MdsPersianDateTimePickerSetting): string {
    let dateTimeJson: GetDateTimeJson1;
    if (setting.isGregorian) {
      dateTimeJson = this.getDateTimeJson1(setting.selectedDateToShow);
    } else {
      dateTimeJson = this.getDateTimeJsonPersian1(setting.selectedDateToShow);
    }
    return this.getDateTimeString(dateTimeJson, 'MMMM yyyy', setting.isGregorian, setting.englishNumber);
  }
  private setPopoverHeaderHtml(element: Element, isInLine: boolean, htmlString: string) {
    // $element = المانی که روی آن فعالیتی انجام شده و باید عنوان تقویم آن عوض شود
    if (!isInLine) {
      if (this.isPopoverDescriber(element)) {
        this.getPopover(element).querySelector('[data-name="mds-datetimepicker-title"]').innerHTML = htmlString;
      } else {
        element.closest(this.mdDatePickerElementSelector + ':first').querySelector('[data-name="mds-datetimepicker-title"]').innerHTML = htmlString;
      }
    } else {
      var inlineTitleBox = element.closest(this.mdDatePickerFlagSelector + ':first').querySelector('[data-name="dateTimePickerYearsButtonsContainer"]');
      inlineTitleBox.innerHTML = htmlString;
      inlineTitleBox.classList.remove('w-0');
    }
  }
  private getDateTimePickerHtml(): string {
    let selectedDateToShow = this.getClonedDate(this.setting.selectedDateToShow);
    let html = this.dateTimePickerHtmlTemplate;

    html = html.replace(/{{rtlCssClass}}/img, this.setting.isGregorian ? '' : 'rtl');
    html = html.replace(/{{selectedDateStringAttribute}}/img, this.setting.inLine ? '' : 'hidden');
    html = html.replace(/{{hourText}}/img, this.setting.isGregorian ? this.hourText : this.hourTextPersian);
    html = html.replace(/{{minuteText}}/img, this.setting.isGregorian ? this.minuteText : this.minuteTextPersian);
    html = html.replace(/{{secondText}}/img, this.setting.isGregorian ? this.secondText : this.secondTextPersian);
    html = html.replace(/{{goTodayText}}/img, this.setting.isGregorian ? this.goTodayText : this.goTodayTextPersian);
    html = html.replace(/{{timePickerAttribute}}/img, this.setting.enableTimePicker ? '' : 'hidden');

    let selectedDateString = '',
      todayDateString = '',
      todayDateTimeJson: GetDateTimeJson1, // year, month, day, hour, minute, second
      rangeSelectorStartDate: Date = !this.setting.rangeSelector || !this.setting.rangeSelectorStartDate ? undefined : this.getClonedDate(this.setting.rangeSelectorStartDate),
      rangeSelectorEndDate: Date = !this.setting.rangeSelector || !this.setting.rangeSelectorEndDate ? undefined : this.getClonedDate(this.setting.rangeSelectorEndDate),
      rangeSelectorStartDateJson: GetDateTimeJson1,
      rangeSelectorEndDateJson: GetDateTimeJson1,
      selectedDateTimeJson: GetDateTimeJson1,
      selectedDateTimeToShowJson: GetDateTimeJson1,
      disableBeforeDateTimeJson: GetDateTimeJson1 | undefined,
      disableAfterDateTimeJson: GetDateTimeJson1 | undefined;

    if (this.setting.isGregorian) {
      selectedDateTimeToShowJson = this.getDateTimeJson1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJson1(new Date());
      rangeSelectorStartDateJson = rangeSelectorStartDate != undefined ? this.getDateTimeJson1(rangeSelectorStartDate) : undefined;
      rangeSelectorEndDateJson = rangeSelectorEndDate != undefined ? this.getDateTimeJson1(rangeSelectorEndDate) : undefined;
      selectedDateTimeJson = this.setting.selectedDate == undefined ? todayDateTimeJson : this.getDateTimeJson1(this.setting.selectedDate);
      disableBeforeDateTimeJson = !this.setting.disableBeforeDate ? undefined : this.getDateTimeJson1(this.setting.disableBeforeDate);
      disableAfterDateTimeJson = !this.setting.disableAfterDate ? undefined : this.getDateTimeJson1(this.setting.disableAfterDate);
    } else {
      selectedDateTimeToShowJson = this.getDateTimeJsonPersian1(selectedDateToShow);
      todayDateTimeJson = this.getDateTimeJsonPersian1(new Date());
      rangeSelectorStartDateJson = rangeSelectorStartDate != undefined ? this.getDateTimeJsonPersian1(rangeSelectorStartDate) : undefined;
      rangeSelectorEndDateJson = rangeSelectorEndDate != undefined ? this.getDateTimeJsonPersian1(rangeSelectorEndDate) : undefined;
      selectedDateTimeJson = this.setting.selectedDate == undefined ? todayDateTimeJson : this.getDateTimeJsonPersian1(this.setting.selectedDate);
      disableBeforeDateTimeJson = !this.setting.disableBeforeDate ? undefined : this.getDateTimeJsonPersian1(this.setting.disableBeforeDate);
      disableAfterDateTimeJson = !this.setting.disableAfterDate ? undefined : this.getDateTimeJsonPersian1(this.setting.disableAfterDate);
    }

    // بررسی پراپرتی های از تاریخ، تا تاریخ
    if ((this.setting.fromDate || this.setting.toDate) && this.setting.groupId) {
      const toDateElement = document.querySelector('[' + this.mdDatePickerGroupIdAttribute + '="' + this.setting.groupId + '"][data-toDate]');
      const fromDateElement = document.querySelector('[' + this.mdDatePickerGroupIdAttribute + '="' + this.setting.groupId + '"][data-fromDate]');
      if (this.setting.fromDate && toDateElement != null) {
        const toDateMdsInstance = MdsPersianDateTimePicker.getInstance(toDateElement);
        if (toDateMdsInstance != null) {
          const toDateSelectedDate = toDateMdsInstance.setting.selectedDate;
          disableAfterDateTimeJson = !toDateSelectedDate ? undefined : this.setting.isGregorian ? this.getDateTimeJson1(toDateSelectedDate) : this.getDateTimeJsonPersian1(toDateSelectedDate);
        }
      } else if (this.setting.toDate && fromDateElement != null) {
        const fromDateInstance = MdsPersianDateTimePicker.getInstance(fromDateElement);
        if (fromDateInstance != null) {
          const fromDateSelectedDate = fromDateInstance.setting.selectedDate;
          disableBeforeDateTimeJson = !fromDateSelectedDate ? undefined : this.setting.isGregorian ? this.getDateTimeJson1(fromDateSelectedDate) : this.getDateTimeJsonPersian1(fromDateSelectedDate);
        }
      }
    }

    if (this.setting.rangeSelector && rangeSelectorStartDateJson != undefined && rangeSelectorEndDateJson != undefined) {
      selectedDateString = `${this.getWeekDayName(rangeSelectorStartDateJson.dayOfWeek, this.setting.isGregorian)}، ${rangeSelectorStartDateJson.day} ${this.getMonthName(rangeSelectorStartDateJson.month - 1, this.setting.isGregorian)} ${rangeSelectorStartDateJson.year} - 
                ${this.getWeekDayName(rangeSelectorEndDateJson.dayOfWeek, this.setting.isGregorian)}، ${rangeSelectorEndDateJson.day} ${this.getMonthName(rangeSelectorEndDateJson.month - 1, this.setting.isGregorian)} ${rangeSelectorEndDateJson.year}`;
    } else
      selectedDateString = `${this.getWeekDayName(selectedDateTimeJson.dayOfWeek, this.setting.isGregorian)}، ${selectedDateTimeJson.day} ${this.getMonthName(selectedDateTimeJson.month - 1, this.setting.isGregorian)} ${selectedDateTimeJson.year}`;
    todayDateString = `${this.setting.isGregorian ? 'Today,' : 'امروز،'} ${todayDateTimeJson.day} ${this.getMonthName(todayDateTimeJson.month - 1, this.setting.isGregorian)} ${todayDateTimeJson.year}`;
    if (!this.setting.englishNumber) {
      selectedDateString = this.toPersianNumber(selectedDateString);
      todayDateString = this.toPersianNumber(todayDateString);
    }

    if (disableAfterDateTimeJson != undefined && disableAfterDateTimeJson.year <= selectedDateTimeToShowJson.year && disableAfterDateTimeJson.month < selectedDateTimeToShowJson.month)
      selectedDateToShow = this.setting.isGregorian ? new Date(disableAfterDateTimeJson.year, disableAfterDateTimeJson.month - 1, 1) : this.getDateTime1(disableAfterDateTimeJson.year, disableAfterDateTimeJson.month, disableAfterDateTimeJson.day);

    if (disableBeforeDateTimeJson != undefined && disableBeforeDateTimeJson.year >= selectedDateTimeToShowJson.year && disableBeforeDateTimeJson.month > selectedDateTimeToShowJson.month)
      selectedDateToShow = this.setting.isGregorian ? new Date(disableBeforeDateTimeJson.year, disableBeforeDateTimeJson.month - 1, 1) : this.getDateTime1(disableBeforeDateTimeJson.year, disableBeforeDateTimeJson.month, disableBeforeDateTimeJson.day);

    var monthsTdHtml = '',
      numberOfNextMonths = this.setting.monthsToShow[1] <= 0 ? 0 : this.setting.monthsToShow[1],
      numberOfPrevMonths = this.setting.monthsToShow[0] <= 0 ? 0 : this.setting.monthsToShow[0];
    numberOfPrevMonths *= -1;
    for (var i1 = numberOfPrevMonths; i1 < 0; i1++) {
      this.setting.selectedDateToShow = this.addMonthToDateTime(this.getClonedDate(selectedDateToShow), i1, false);
      monthsTdHtml += this.getDateTimePickerMonthHtml1(this.setting, false, true);
    }
    this.setting.selectedDateToShow = this.getClonedDate(selectedDateToShow);
    monthsTdHtml += this.getDateTimePickerMonthHtml1(this.setting, false, false);
    for (var i2 = 1; i2 <= numberOfNextMonths; i2++) {
      this.setting.selectedDateToShow = this.addMonthToDateTime(this.getClonedDate(selectedDateToShow), i2, false);
      monthsTdHtml += this.getDateTimePickerMonthHtml1(this.setting, true, false);
    }

    var totalMonthNumberToShow = Math.abs(numberOfPrevMonths) + 1 + numberOfNextMonths,
      monthTdStyle = totalMonthNumberToShow > 1 ? 'width: ' + (100 / totalMonthNumberToShow).toString() + '%;' : '';

    monthsTdHtml = monthsTdHtml.replace(/{{monthTdStyle}}/img, monthTdStyle);

    html = html.replace(/{{selectedDateString}}/img, selectedDateString);
    html = html.replace(/{{todayDateString}}/img, todayDateString);
    html = html.replace(/{{hour}}/img, selectedDateTimeToShowJson.hour.toString());
    html = html.replace(/{{minute}}/img, selectedDateTimeToShowJson.minute.toString());
    html = html.replace(/{{second}}/img, selectedDateTimeToShowJson.second.toString());
    html = html.replace(/{{monthsTdHtml}}/img, monthsTdHtml);

    return html;
  }
  private enableEvents(): void {
    this.element.addEventListener('click', this.showPopoverEvent, true);
    document.getElementsByTagName('HTML')[0].addEventListener('click', this.hidePopoverEvent, false);
  }
  private showPopoverEvent(e: PointerEvent): void {
    MdsPersianDateTimePicker.getInstance(<Element>e.target).show();
  }
  private hidePopoverEvent(e: PointerEvent): void {
    const element = <Element>e.target;
    if (element.tagName == 'HTML') {
      MdsPersianDateTimePickerData.getAll().forEach(i => {
        i.hide();
      });
      return;
    }
    const isWithinDatePicker = element.closest('[data-mds-date-time-picker]') != null ||
      element.getAttribute('mds-date-picker-guid') != undefined;
    if (!isWithinDatePicker)
      MdsPersianDateTimePickerData.getAll().forEach(i => {
        i.hide();
      });
  }


  show(): void {
    this.bsPopover.show();
  }
  hide(): void {
    this.bsPopover.hide();
  }
  toggle(): void {
    this.bsPopover.toggle();
  }
  enable(): void {
    this.bsPopover.enable();
  }
  disable(): void {
    this.bsPopover.disable();
  }
  update(): void {
    this.bsPopover.update();
  }
  dispose(): void {
    this.bsPopover.dispose();
    this.element.removeEventListener('click', this.showPopoverEvent);
    document.getElementsByTagName('HTML')[0].removeEventListener('click', this.hidePopoverEvent);
  }
  getBsPopoverInstance() {
    return this.bsPopover;
  }

  static getInstance(element: Element): MdsPersianDateTimePicker {
    const elementGuid = element.getAttribute('mds-date-picker-guid');
    if (!elementGuid) return null;
    return MdsPersianDateTimePickerData.get(elementGuid);
  }

  // #endregion
}

enum AmPmEnum {
  am,
  pm,
  none
}

interface GetDateTimeJson1 {
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  dayOfWeek: number
}

class MdsPersianDateTimePickerSetting {
  englishNumber = false;
  placement: "auto" | "top" | "bottom" | "left" | "right" | (() => void) = 'bottom';
  trigger = 'click';
  enableTimePicker = false;
  targetTextSelector = '';
  targetDateSelector = '';
  toDate = false;
  fromDate = false;
  groupId = '';
  disabled = false;
  textFormat = 'yyyy/MM/dd';
  dateFormat = '';
  isGregorian = false;
  inLine = false;
  selectedDate: Date = null; // Date initial value
  selectedDateToShow = new Date();
  monthsToShow = [0, 0];
  yearOffset = 15;
  holiDays: Date[] = [];
  disabledDates: Date[] = [];
  disabledDays: number[] = []; // روزهایی از هفته که غیر فعال هستند
  specialDates: Date[] = [];
  disableBeforeToday = false;
  disableAfterToday = false;
  disableBeforeDate: Date = null;
  disableAfterDate: Date = null;
  rangeSelector = false;
  rangeSelectorStartDate: Date = null;
  rangeSelectorEndDate: Date = null;
  modalMode = false;
  calendarViewOnChange = () => { };
  onDayClick = () => { }
}

const MdsPersianDateTimePickerElementMap = new Map();
var MdsPersianDateTimePickerData = {
  set(key: string, instance: MdsPersianDateTimePicker): void {
    if (!MdsPersianDateTimePickerElementMap.has(key)) {
      MdsPersianDateTimePickerElementMap.set(key, instance);
      return;
    }
    MdsPersianDateTimePickerElementMap.set(key, instance);
  },
  get(key: string): MdsPersianDateTimePicker {
    return MdsPersianDateTimePickerElementMap.get(key) || null;
  },
  getAll(): MdsPersianDateTimePicker[] {
    return Array.from(MdsPersianDateTimePickerElementMap, ([name, value]) => value);
  },
  remove(key: string): void {
    if (!MdsPersianDateTimePickerElementMap.has(key)) {
      return;
    }
    MdsPersianDateTimePickerElementMap.delete(key);
  }
};