

def sum(a, b, fn=None):

    c = a + b
    print(f"{a} + {b} = {c}")

    if fn is not None:
        # fn(c)
        print(f"fn res = {fn(c)}")
        print(f"fn end")



if __name__ == "__main__":
    def cb(c):
        print(f"c = {c}")
    sum(6, 8, cb)
