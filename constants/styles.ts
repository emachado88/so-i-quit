import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  container: {
    paddingInline: 20,
    paddingBlock: 15,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  flex1: {
    flex: 1,
  },
  spacedUppercase: {
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
