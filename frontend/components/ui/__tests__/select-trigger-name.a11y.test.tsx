import { render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { expectNoAxeViolations } from "@/test-utils";


interface TimezoneFormValues {
  timezone: string;
}

function FormWrappedSelect() {
  const form = useForm<TimezoneFormValues>({
    defaultValues: { timezone: "asia-kolkata" },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="asia-kolkata">Asia/Kolkata</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </Form>
  );
}

describe("a SelectTrigger is named by something specific to the field", () => {
  it("takes the placeholder its own SelectValue carries", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Priority" })).toBeInTheDocument();
  });

  it("finds the placeholder through an intervening wrapper element", () => {
    render(
      <Select>
        <SelectTrigger>
          <span>
            <SelectValue placeholder="Warehouse" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Warehouse" })).toBeInTheDocument();
  });

  it("an explicit aria-label wins over the placeholder", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Filter notifications by priority">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(
      screen.getByRole("combobox", { name: "Filter notifications by priority" }),
    ).toBeInTheDocument();
  });

  it("an associated visible label wins over the placeholder", () => {
    render(
      <div>
        <Label htmlFor="tz">Timezone</Label>
        <Select>
          <SelectTrigger id="tz">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Asia/Kolkata</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    );
    const trigger = screen.getByRole("combobox", { name: "Timezone" });
    expect(trigger).not.toHaveAttribute("aria-label");
  });

  it("a FormControl-wrapped trigger is named by its FormLabel, not overridden", () => {
    render(<FormWrappedSelect />);
    const trigger = screen.getByRole("combobox", { name: "Timezone" });
    expect(trigger).toHaveAttribute("id");
    expect(trigger).not.toHaveAttribute("aria-label");
  });

  it("a named trigger is clean under axe", async () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    await expectNoAxeViolations(container);
  });
});

describe("BITE — the fallback is specific, and refuses to invent a name", () => {
  it("a trigger with no name source stays nameless and still fails axe", async () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toHaveAttribute("aria-label");
    await expect(expectNoAxeViolations(container)).rejects.toThrow();
  });

  it("an empty or whitespace placeholder is not a name", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="   " />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-label");
  });

  it("two triggers with different placeholders do not collapse to one name", () => {
    render(
      <div>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="b">B</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    );
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority" })).toBeInTheDocument();
  });
});
