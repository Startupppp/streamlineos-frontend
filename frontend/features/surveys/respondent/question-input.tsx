import type { QuestionInputProps } from "./answer-value";
import {
  ShortTextInput,
  LongTextInput,
  NumberInput,
  EmailInput,
  PhoneQuestionInput,
  DateInput,
  ConsentInput,
  ContentBlockDisplay,
} from "./simple-question-input";
import { SingleSelectInput, MultiSelectInput, DropdownInput, YesNoInput } from "./choice-question-input";
import { RatingInput, StarRatingInput, NpsInput, SliderInput, LikertInput } from "./scale-question-input";
import { MatrixInput, RankingInput } from "./matrix-ranking-input";

const INPUT_BY_TYPE: Record<string, (props: QuestionInputProps) => React.JSX.Element | null> = {
  short_text: ShortTextInput,
  long_text: LongTextInput,
  single_select: SingleSelectInput,
  multi_select: MultiSelectInput,
  dropdown: DropdownInput,
  rating: RatingInput,
  star_rating: StarRatingInput,
  nps: NpsInput,
  number: NumberInput,
  email: EmailInput,
  phone: PhoneQuestionInput,
  date: DateInput,
  matrix: MatrixInput,
  likert: LikertInput,
  ranking: RankingInput,
  slider: SliderInput,
  yes_no: YesNoInput,
  consent: ConsentInput,
  content_block: ContentBlockDisplay,
};

export function QuestionInput(props: QuestionInputProps) {
  const Component = INPUT_BY_TYPE[props.question.type];
  if (!Component) return null;
  return <Component {...props} />;
}
