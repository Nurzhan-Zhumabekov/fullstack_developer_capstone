import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const kansas = {
  id: 8, full_name: "Bytecard Car Dealership", address: "288 Larry Place",
  city: "Topeka", state: "Kansas", zip: "66642",
};
const nebraska = {
  id: 5, full_name: "Nebraska Motors", address: "9 Pine Lane",
  city: "Omaha", state: "Nebraska", zip: "68102",
};
const originalFetch = global.fetch;

function response(data) {
  return Promise.resolve({
    ok: true, status: 200, json: async () => ({ status: 200, ...data }),
  });
}

function open(path) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  global.fetch = originalFetch;
  document.cookie = "csrftoken=; Max-Age=0; path=/";
});

test("filters dealers by Kansas, keeps the real address and gates review actions", async () => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/session")) return response({ authenticated: true, userName: "casey" });
    if (url.endsWith("/Kansas")) return response({ dealers: [kansas] });
    return response({ dealers: [kansas, nebraska] });
  });

  open("/dealers");
  expect(await screen.findByText("288 Larry Place")).toBeVisible();
  expect(await screen.findByText("casey")).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "Review Dealer" })).toBeVisible();
  expect(screen.getByText("9 Pine Lane")).toBeVisible();

  fireEvent.change(screen.getByLabelText("Filter by state"), { target: { value: "Kansas" } });
  expect(await screen.findByText("1 dealer found")).toBeVisible();
  expect(screen.queryByText("9 Pine Lane")).not.toBeInTheDocument();
  const row = screen.getByRole("row", { name: /Bytecard/ });
  expect(within(row).getByText("288 Larry Place")).toBeVisible();
  expect(within(row).getByRole("link", { name: "Write review" }))
    .toHaveAttribute("href", "/postreview/8");
});

test("posts a review with CSRF, preserves multiword model and displays saved content", async () => {
  document.cookie = "csrftoken=example-token; path=/";
  const saved = "The team explained the paperwork clearly.";
  let submitted = false;
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/session")) return response({ authenticated: true, userName: "casey" });
    if (url.endsWith("/dealer/8") && !url.includes("/reviews/")) {
      return response({ dealer: kansas });
    }
    if (url.endsWith("/get_cars")) {
      return response({ CarModels: [{ CarMake: "Land Rover", CarModel: "Range Rover" }] });
    }
    if (url.endsWith("/add_review")) {
      submitted = true;
      return response({});
    }
    return response({ reviews: submitted ? [{ id: 17, name: "casey", review: saved }] : [] });
  });

  open("/postreview/8");
  await screen.findByRole("option", { name: "Land Rover" });
  fireEvent.change(screen.getByLabelText("Your review"), { target: { value: saved } });
  fireEvent.change(screen.getByLabelText("Car make"), { target: { value: "Land Rover" } });
  fireEvent.change(screen.getByLabelText("Car model"), { target: { value: "Range Rover" } });
  fireEvent.change(screen.getByLabelText("Car year"), { target: { value: "2020" } });
  fireEvent.change(screen.getByLabelText("Purchase date"), { target: { value: "2022-03-12" } });
  fireEvent.click(screen.getByRole("button", { name: "Post review" }));
  expect(await screen.findByText("Your review was posted.")).toBeVisible();
  expect(await screen.findByText(saved)).toBeVisible();

  const submission = global.fetch.mock.calls.find(([url]) => url === "/djangoapp/add_review");
  expect(submission[1].headers["X-CSRFToken"]).toBe("example-token");
  expect(JSON.parse(submission[1].body)).toEqual({
    dealership: 8, review: saved, purchase: true, purchase_date: "2022-03-12",
    car_make: "Land Rover", car_model: "Range Rover", car_year: 2020,
  });
});

test("registration uses the server session to reveal signed-in review actions", async () => {
  document.cookie = "csrftoken=example-token; path=/";
  let registered = false;
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/session")) {
      return response({ authenticated: registered, userName: registered ? "casey" : "" });
    }
    if (url.endsWith("/register")) {
      registered = true;
      return response({ status: 201 });
    }
    return response({ dealers: [kansas] });
  });

  open("/dealers");
  const register = await screen.findByRole("link", { name: "Register" });
  expect(await screen.findByText("288 Larry Place")).toBeVisible();
  expect(screen.queryByRole("columnheader", { name: "Review Dealer" })).not.toBeInTheDocument();
  fireEvent.click(register);
  for (const [label, value] of [
    ["First name", "Casey"], ["Last name", "Morgan"], ["Username", "casey"],
    ["Email", "casey@example.com"], ["Password", "test-password"],
    ["Confirm password", "test-password"],
  ]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Register" }));

  expect(await screen.findByText("casey")).toBeVisible();
  expect(await screen.findByText("288 Larry Place")).toBeVisible();
  expect(await screen.findByRole("columnheader", { name: "Review Dealer" })).toBeVisible();
  const submission = global.fetch.mock.calls.find(([url]) => url === "/djangoapp/register");
  expect(submission[1].headers["X-CSRFToken"]).toBe("example-token");
});
